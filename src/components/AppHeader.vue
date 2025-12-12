<!-- src/components/AppHeader.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types/api';
import { storeToRefs } from 'pinia';
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const userGreeting = computed(() => authStore.nickname ?? authStore.email ?? 'Viandante');
const { roles } = storeToRefs(authStore);
//const rolesLabel = computed(() => authStore.roleBadge || 'Ruolo sconosciuto');
// Mappa i ruoli tecnici (ROLE_*) in etichette leggibili
const rolesLabel = computed(() => {
  const list = roles.value as UserRole[];

  if (list.includes('ROLE_ADMIN')) {
    return 'Admin';
  }
  if (list.includes('ROLE_GM')) {
    return 'Dungeon Master';
  }
  if (list.includes('ROLE_PLAYER')) {
    return 'Player';
  }
  if (list.includes('ROLE_VIEWER')) {
    return 'Viewer';
  }

  return 'Ospite';
});

const navItems = computed(() => {
  if (!authStore.isAuthenticated) {
    return [{ label: 'Accedi', to: '/login' }];
  }
  if (authStore.canManageContent) {
    return [
      { label: 'Dashboard', to: '/dm/dashboard' },
      { label: 'Mondi', to: '/dm/worlds' },
      { label: 'NPC', to: '/dm/npcs' },
      { label: 'Location', to: '/dm/locations' },
      { label: 'Oggetti', to: '/dm/items' },
      { label: 'Richieste campagne', to: '/dm/join-requests' },
    ];
  }
  if (authStore.isViewerOnly) {
    return [
      { label: 'Dashboard', to: '/player/dashboard' },
      { label: 'Mondi pubblici', to: '/player/worlds' },
    ];
  }
  return [
    { label: 'Dashboard', to: '/player/dashboard' },
    { label: 'I miei personaggi', to: '/player/characters' },
    { label: 'Mondi pubblici', to: '/player/worlds' },
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
      <p class="brand-title">D&D Manager</p>
      <p class="brand-subtitle">Non perdere i tuoi mondii</p>
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
