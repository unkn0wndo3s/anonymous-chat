<template>
  <div>
    <HeaderBar
      :status="status"
      v-model:name="nameInput"
      @connect="onConnectClick"
    />

    <main>
      <aside>
        <h3>Connectés</h3>
        <UsersList :users="users" :selfId="selfUser?.id || null" />
        <h3>En train d'écrire</h3>
        <TypersList :typers="typers" />
      </aside>

      <section>
        <MessagesList
          :messages="messages"
          ref="msgsRef"
        />

        <!-- Input non désactivé : on bloque l'envoi dans onSubmit si WS pas connecté -->
        <ChatInput
          :disabled="false"
          @typing="sendTyping"
          @submit="onSubmit"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useWsChat } from '../composables/useWsChat';
import HeaderBar from '@/components/HeaderBar.vue';
import UsersList from '@/components/UsersList.vue';
import TypersList from '@/components/TypersList.vue';
import MessagesList from '@/components/MessagesList.vue';
import ChatInput from '@/components/ChatInput.vue';

const {
  status,
  selfUser,
  users,
  typers,
  messages,
  nameInput,
  connect,
  sendAuth,
  sendTyping,
  sendMessage,
  sendFiles
} = useWsChat();

const msgsRef = ref<InstanceType<typeof MessagesList> | null>(null);

function onConnectClick(): void {
  sendAuth();
}

// Reçoit { text, file? } de <ChatInput />
async function onSubmit(payload: { text: string; files?: File[] }) {
  const t = (payload.text || '').trim();
  const fs = payload.files ?? [];

  if (status.value !== 'connected') return;

  if (fs.length) {
    await sendFiles(fs, t);
  } else if (t) {
    sendMessage(t);
  }
}


onMounted(() => {
  connect();
});
</script>

<style scoped>
main { display: grid; grid-template-columns: 260px 1fr; gap: 1rem; }
aside { border-right: 1px solid #333; padding-right: 1rem; }
section { display: grid; grid-template-rows: 1fr auto; height: calc(100vh - 160px); gap: 0.5rem; }
</style>
