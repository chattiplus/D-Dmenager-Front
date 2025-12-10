<!-- src/components/AppHeader.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import  D20Dice  from '../components/D20Dice.vue';
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const userGreeting = computed(() => authStore.nickname ?? authStore.email ?? 'Viandante');
const rolesLabel = computed(() => authStore.roleBadge || 'Ruolo sconosciuto');
const navItems = computed(() => {
  if (!authStore.isAuthenticated) {
    return [{ label: 'Accedi', to: '/login' }];
  }
  if (authStore.canManageContent) {
    return [
      { label: 'Dashboard', to: '/dm/dashboard' },
      { label: 'Mondi', to: '/worlds' },
      { label: 'Richieste campagne', to: '/dm/join-requests' },
      { label: 'Dadi', to: '/dice' },
    ];
  }
  return [
    { label: 'Dashboard', to: '/player/dashboard' },
    { label: 'I miei personaggi', to: '/player/characters' },
    { label: 'Mondi pubblici', to: '/player/worlds' },
    { label: 'Dadi', to: '/dice' },
  ];
});

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <p class="brand-title">DD Manager</p>
      <p class="brand-subtitle">Tavolo di comando del Dungeon Master</p>
    </div>
    <div class="login-dice">
      <D20Dice />
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
      <p class="user-name">Benvenuto, {{ userGreeting }}</p>
      <p class="user-roles">Ruolo: {{ rolesLabel }}</p>
      <button class="btn btn-secondary" @click="handleLogout">Esci dalla sessione</button>
    </div>
  </header>
</template>
