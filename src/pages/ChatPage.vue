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
          :containerRef="msgsContainer"
        />

        <ChatInput
          :disabled="status !== 'connected'"
          @typing="sendTyping"
          @submit="sendMessage"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
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
  msgsContainer,
  connect,
  sendAuth,
  sendTyping,
  sendMessage,
} = useWsChat();

function onConnectClick(): void {
  sendAuth();
}

onMounted(() => {
  connect();
});
</script>

<style scoped>
</style>