<template>
  <ul>
    <li
      v-for="u in users"
      :key="u.id"
      :class="['user', { me: selfId && u.id === selfId }]"
    >
      {{ u.name }}<template v-if="selfId && u.id === selfId"> (moi)</template>
    </li>
  </ul>
</template>

<script setup lang="ts">
type User = { id: string; name: string };

defineProps<{
  users: User[];
  selfId: string | null;
}>();
</script>
