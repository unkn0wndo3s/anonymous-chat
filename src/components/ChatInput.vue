<template>
  <form class="form" @submit.prevent="submit">
    <textarea
      ref="ta"
      :disabled="disabled"
      v-model="text"
      placeholder="Écrire un message…"
      @input="onTyping"
    ></textarea>
    <button type="submit" :disabled="disabled || !text.trim()">Envoyer</button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ disabled: boolean }>();
const emit = defineEmits<{
  (e: 'typing', text: string): void;
  (e: 'submit', text: string): void;
}>();

const ta = ref<HTMLTextAreaElement | null>(null);
const text = ref<string>('');

function onTyping(): void {
  emit('typing', text.value);
}

function submit(): void {
  const t = text.value.trim();
  if (!t || props.disabled) return;
  emit('submit', t);
  text.value = '';
  // stop typing côté parent déjà géré après envoi
}
</script>
