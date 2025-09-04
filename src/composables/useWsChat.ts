import { ref, computed, nextTick } from 'vue';

type User = { id: string; name: string };
type SelfUser = User | null;
type TypingUser = { id: string; name: string; text: string };
type ChatMessage = { id: string; name: string; text: string; ts: number };

const WS_URL = `ws://localhost:8080`;


export function useWsChat() {
  const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const selfUser = ref<SelfUser>(null);
  const usersMap = ref<Map<string, string>>(new Map());
  const typingMap = ref<Map<string, { name: string; text: string }>>(new Map());
  const messages = ref<ChatMessage[]>([]);
  const nameInput = ref<string>('');
  let ws: WebSocket | null = null;

  // Refs utilitaires pour scroll
  const msgsContainer = ref<HTMLElement | null>(null);

  function connect(): void {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    status.value = 'connecting';
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      status.value = 'connected';
      const name = (nameInput.value || 'Anonyme');
      ws?.send(JSON.stringify({ type: 'auth', name }));
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'hello':
          status.value = 'connecting';
          break;

        case 'welcome': {
          selfUser.value = msg.self as User;

          usersMap.value = new Map<string, string>();
          for (const u of msg.users as User[]) {
            usersMap.value.set(u.id, u.name);
          }

          typingMap.value = new Map<string, { name: string; text: string }>();
          for (const t of msg.typing as TypingUser[]) {
            typingMap.value.set(t.id, { name: t.name, text: t.text });
          }

          messages.value = [];
          for (const m of msg.history as ChatMessage[]) {
            messages.value.push(m);
          }
          scrollBottomSoon();
          break;
        }

        case 'user_joined':
          usersMap.value.set(msg.id as string, msg.name as string);
          break;

        case 'user_left':
          usersMap.value.delete(msg.id as string);
          typingMap.value.delete(msg.id as string);
          break;

        case 'typing': {
          const id = msg.id as string;
          const name = msg.name as string;
          const text = (msg.text as string) || '';
          if (text.length) {
            typingMap.value.set(id, { name, text });
          } else {
            typingMap.value.delete(id);
          }
          break;
        }

        case 'message': {
          const id = msg.id as string;
          typingMap.value.delete(id); // message => stop typing
          const entry: ChatMessage = {
            id,
            name: msg.name as string,
            text: msg.text as string,
            ts: msg.ts as number,
          };
          messages.value.push(entry);
          scrollBottomSoon();
          break;
        }

        case 'users': {
          usersMap.value = new Map<string, string>();
          for (const u of msg.users as User[]) {
            usersMap.value.set(u.id, u.name);
          }
          break;
        }

        case 'error':
          console.warn('Server error:', msg.message);
          break;
      }
    };

    ws.onclose = () => {
      status.value = 'disconnected';
      // Reconnexion auto
      setTimeout(connect, 800);
    };

    ws.onerror = () => {
      try { ws?.close(); } catch {}
    };
  }

  function sendAuth(): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
      return;
    }
    const name = (nameInput.value || 'Anonyme');
    ws.send(JSON.stringify({ type: 'auth', name }));
  }

  // Typing (debounce léger)
  let lastTyping = 0;
  function sendTyping(text: string): void {
    const now = Date.now();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (now - lastTyping < 80) return;
    lastTyping = now;
    ws.send(JSON.stringify({ type: 'typing', text }));
  }

  function sendMessage(text: string): void {
    if (!text.trim()) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'message', text: text.trim() }));
    // stop typing
    ws.send(JSON.stringify({ type: 'typing', text: '' }));
  }

  function scrollBottomSoon(): void {
    nextTick(() => {
      const el = msgsContainer.value;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }

  const users = computed<User[]>(() =>
    Array.from(usersMap.value.entries()).map(([id, name]) => ({ id, name }))
  );

  const typers = computed<TypingUser[]>(() =>
    Array.from(typingMap.value.entries()).map(([id, t]) => ({ id, name: t.name, text: t.text }))
  );

  return {
    status,
    selfUser,
    users,
    typers,
    messages,
    nameInput,
    msgsContainer,
    connect,
    sendAuth,
    sendTyping,
    sendMessage,
  };
}
