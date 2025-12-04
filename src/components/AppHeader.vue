<!-- src/components/AppHeader.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { label: 'Login', to: '/login' },
  { label: 'Worlds', to: '/worlds' },
];

const title = computed(() =>
  route.name === 'worlds' ? 'DD Manager – Worlds' : 'DD Manager – Login',
);
</script>

<template>
  <header class="header">
    <div>
      <p class="title">{{ title }}</p>
      <p class="subtitle">Frontend demo con Vue 3 + Vite + TypeScript</p>
    </div>
    <nav class="nav">
      <RouterLink
        v-for="link in navItems"
        :key="link.to"
        :to="link.to"
        :class="{ active: route.path === link.to }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </header>
</template>
