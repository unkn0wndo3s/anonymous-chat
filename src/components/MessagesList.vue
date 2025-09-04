<template>
  <div class="msgs" ref="localRef">
    <div
      v-for="m in messages"
      :key="m.ts + '_' + m.id"
      class="msg"
    >
      <div class="meta">{{ m.name }} • {{ formatTime(m.ts) }}</div>
      <div>{{ m.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue';

type ChatMessage = { id: string; name: string; text: string; ts: number };

const props = defineProps<{
  messages: ChatMessage[];
  containerRef: HTMLElement | null;
}>();

const localRef = ref<HTMLElement | null>(null);

function formatTime(ts: number): string {
  try {
    return new Date(ts || Date.now()).toLocaleTimeString();
  } catch {
    return '';
  }
}

// garde le scroll bas quand messages change
watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    const el = localRef.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }
);

onMounted(() => {
  // expose aussi la ref au parent si besoin (optionnel)
});
</script>
