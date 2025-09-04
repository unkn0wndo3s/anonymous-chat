<template>
  <header>
    <input
      :value="name"
      @input="$emit('update:name', ($event.target as HTMLInputElement).value)"
      placeholder="Pseudo…"
    />
    <button @click="$emit('connect')">
      Se connecter
    </button>
    <span>{{ label }}</span>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: 'disconnected' | 'connecting' | 'connected';
  name: string;
}>();

const label = computed(() => {
  if (props.status === 'connected') return 'Connecté';
  if (props.status === 'connecting') return 'Connexion…';
  return 'Déconnecté. Reconnexion auto…';
});

defineEmits<{
  (e: 'connect'): void;
  (e: 'update:name', v: string): void;
}>();
</script>
