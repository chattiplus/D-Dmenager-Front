<!-- src/components/AppHeader.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const navItems = [
  { label: 'Login', to: '/login' },
  { label: 'Worlds', to: '/worlds' },
];

const title = computed(() =>
  route.name === 'worlds' ? 'DD Manager - Worlds' : 'DD Manager - Login',
);

const rolesLabel = computed(() => (authStore.roleBadge || 'Nessun ruolo assegnato'));

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
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

    <div v-if="authStore.isAuthenticated" class="user-info">
      <p class="user-name">{{ authStore.nickname ?? authStore.email }}</p>
      <p class="user-roles">{{ rolesLabel }}</p>
      <button class="secondary" @click="handleLogout">Logout</button>
    </div>
  </header>
</template>
