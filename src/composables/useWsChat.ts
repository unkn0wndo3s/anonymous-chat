import { ref, computed, nextTick } from 'vue';

type User = { id: string; name: string };
type SelfUser = User | null;
type TypingUser = { id: string; name: string; text: string };

export type FileAttachment = {
  name: string;
  mime: string;
  size: number;
  data: string; // base64
};

export type ChatMessage = {
  id: string;
  name: string;
  ts: number;
  text?: string | null;
  files?: FileAttachment[]; // ← tableau
};

const WS_URL = `ws://localhost:8080`;

export function useWsChat() {
  const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const selfUser = ref<SelfUser>(null);
  const usersMap = ref<Map<string, string>>(new Map());
  const typingMap = ref<Map<string, { name: string; text: string }>>(new Map());
  const messages = ref<ChatMessage[]>([]);
  const nameInput = ref<string>('');
  let ws: WebSocket | null = null;

  const msgsContainer = ref<HTMLElement | null>(null);

  function connect(): void {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    status.value = 'connecting';
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      const name = (nameInput.value || 'Anonyme');
      ws?.send(JSON.stringify({ type: 'auth', name }));
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }

      switch (msg.type) {
        case 'hello':
          break;

        case 'welcome': {
          status.value = 'connected';
          selfUser.value = msg.self as User;

          const u = new Map<string, string>();
          for (const user of msg.users as User[]) u.set(user.id, user.name);
          usersMap.value = u;

          const t = new Map<string, { name: string; text: string }>();
          for (const ty of msg.typing as TypingUser[]) t.set(ty.id, { name: ty.name, text: ty.text });
          typingMap.value = t;

          messages.value = (msg.history as ChatMessage[]).map((m) => ({
            id: m.id,
            name: m.name,
            ts: m.ts,
            text: m.text ?? null,
            files: Array.isArray((m as any).files) ? (m as any).files : [], // ← safe
          }));
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
          const nm = msg.name as string;
          const text = (msg.text as string) || '';
          if (text.length) typingMap.value.set(id, { name: nm, text });
          else typingMap.value.delete(id);
          break;
        }

        case 'message': {
          const id = msg.id as string;
          typingMap.value.delete(id);
          const entry: ChatMessage = {
            id,
            name: msg.name as string,
            ts: msg.ts as number,
            text: (msg.text as string) ?? null,
            files: Array.isArray(msg.files) ? msg.files as FileAttachment[] : [],
          };
          messages.value.push(entry);
          scrollBottomSoon();
          break;
        }

        case 'users': {
          const u2 = new Map<string, string>();
          for (const user of msg.users as User[]) u2.set(user.id, user.name);
          usersMap.value = u2;
          break;
        }

        case 'error':
          console.warn('WS error:', msg.message);
          break;
      }
    };

    ws.onclose = () => {
      status.value = 'disconnected';
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
    ws.send(JSON.stringify({ type: 'typing', text: '' }));
  }

  async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
    }
    return btoa(binary);
  }

  async function sendFiles(files: File[], text?: string): Promise<void> {
    if (!files?.length) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const encoded: FileAttachment[] = [];
    for (const f of files) {
      const base64 = await fileToBase64(f);
      encoded.push({
        name: f.name,
        mime: f.type || 'application/octet-stream',
        size: f.size,
        data: base64,
      });
    }

    const payload = {
      type: 'message',
      text: (text ?? '').trim(),
      files: encoded, // ← envoi en tableau
    };
    ws.send(JSON.stringify(payload));
    ws.send(JSON.stringify({ type: 'typing', text: '' }));
  }

  // compat API: un seul fichier
  async function sendFile(file: File, text?: string): Promise<void> {
    await sendFiles([file], text);
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
    sendFile,
    sendFiles, // ← nouveau
  };
}
