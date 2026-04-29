<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import MobileBottomNav from '../components/mobile/MobileBottomNav.vue';
import { useAuthStore } from '../store/authStore';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isCreateOpen = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const isSessionRoute = computed(() => {
  return route.name === 'session-detail' || route.name === 'dm-session-detail';
});

const sessionTabs = computed(() => {
  if (route.name === 'dm-session-detail') {
    return [
      { key: 'events', label: 'Eventi' },
      { key: 'chat', label: 'Chat' },
      { key: 'whispers', label: 'Sussurri' },
      { key: 'resources', label: 'Risorse' },
      { key: 'characters', label: 'Personaggi' },
    ];
  }

  return [
    { key: 'events', label: 'Eventi' },
    { key: 'chat', label: 'Chat' },
    { key: 'whispers', label: 'Sussurri' },
    { key: 'resources', label: 'Risorse' },
    { key: 'sheet', label: 'Scheda' },
  ];
});

const bottomNavItems = computed(() => {
  if (!isAuthenticated.value) {
    return [];
  }

  if (isSessionRoute.value) {
    const currentTab = typeof route.query.tab === 'string' ? route.query.tab : 'events';
    return sessionTabs.value.map((tab) => ({
      key: tab.key,
      label: tab.label,
      active: currentTab === tab.key,
      to: {
        name: route.name as string,
        params: route.params as Record<string, string | number>,
        query: {
          ...Object.fromEntries(
            Object.entries(route.query)
              .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
          ),
          tab: tab.key,
        },
      },
    }));
  }

  const homeRoute = authStore.canManageContent ? '/dm/dashboard' : '/player/dashboard';

  return [
    {
      key: 'home',
      label: 'Home',
      active: route.path === homeRoute,
      to: homeRoute,
    },
    {
      key: 'campaigns',
      label: 'Campagne',
      active: route.path === '/mobile/campaigns',
      to: '/mobile/campaigns',
    },
    {
      key: 'create',
      label: 'Crea',
      active: isCreateOpen.value,
    },
    {
      key: 'profile',
      label: 'Profilo',
      active: route.path === '/mobile/profile',
      to: '/mobile/profile',
    },
  ];
});

const shortcutItems = computed(() => {
  const canManage = authStore.canManageContent;
  const canCreateCharacter = authStore.roles.includes('ROLE_PLAYER') || authStore.roles.includes('ROLE_VIEWER');

  return [
    {
      key: 'campaign',
      label: 'Crea campagna',
      description: 'Apre la gestione mondi e campagne.',
      to: '/dm/worlds',
      disabled: !canManage,
    },
    {
      key: 'session',
      label: 'Crea sessione',
      description: 'Usa il dettaglio campagna per aggiungere sessioni.',
      to: '/dm/worlds',
      disabled: !canManage,
    },
    {
      key: 'character',
      label: 'Crea personaggio',
      description: 'Apre la schermata personaggi del giocatore.',
      to: '/player/characters',
      disabled: !canCreateCharacter,
    },
    {
      key: 'npc',
      label: 'Crea NPC',
      description: 'Apre la sezione NPC.',
      to: '/dm/npcs',
      disabled: !canManage,
    },
    {
      key: 'world',
      label: 'Crea mondo',
      description: 'Apre la sezione mondi.',
      to: '/dm/worlds',
      disabled: !canManage,
    },
    {
      key: 'item',
      label: 'Crea oggetto',
      description: 'Apre la sezione oggetti.',
      to: '/dm/items',
      disabled: !canManage,
    },
    {
      key: 'location',
      label: 'Crea location',
      description: 'Apre la sezione location.',
      to: '/dm/locations',
      disabled: !canManage,
    },
  ];
});

const closeCreateOverlay = () => {
  isCreateOpen.value = false;
};

const handleNavAction = (key: string) => {
  if (key === 'create') {
    isCreateOpen.value = !isCreateOpen.value;
  }
};

watch(
  () => route.fullPath,
  () => {
    isCreateOpen.value = false;
  },
);
</script>

<template>
  <div class="mobile-app-shell">
    <main class="mobile-app-shell__content">
      <RouterView />
    </main>

    <transition name="mobile-sheet">
      <div v-if="isCreateOpen" class="mobile-create-overlay" @click.self="closeCreateOverlay">
        <section class="mobile-create-sheet stack">
          <header class="mobile-create-sheet__header">
            <div>
              <p class="mobile-screen__eyebrow">Crea</p>
              <h2 class="card-title">Azioni rapide</h2>
            </div>
            <button type="button" class="btn btn-secondary" @click="closeCreateOverlay">
              Chiudi
            </button>
          </header>

          <div class="mobile-shortcut-grid">
            <button
              v-for="item in shortcutItems"
              :key="item.key"
              type="button"
              class="mobile-shortcut-card"
              :class="{ disabled: item.disabled }"
              :disabled="item.disabled"
              @click="router.push(item.to)"
            >
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </button>
          </div>
        </section>
      </div>
    </transition>

    <MobileBottomNav
      v-if="bottomNavItems.length"
      :items="bottomNavItems"
      @action="handleNavAction"
    />
  </div>
</template>
