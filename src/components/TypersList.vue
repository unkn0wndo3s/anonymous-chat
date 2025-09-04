<template>
  <ul>
    <li v-for="t in typers" :key="t.id" class="typingUser">
      <strong>{{ t.name }}</strong>
      <small>{{ truncated(t.text) }}</small>
    </li>
  </ul>
</template>

<script setup lang="ts">
type TypingUser = { id: string; name: string; text: string };

const props = defineProps<{ typers: TypingUser[] }>();

function truncated(s: string): string {
  return s.length > 60 ? s.slice(0, 57) + '…' : s;
}
</script>
