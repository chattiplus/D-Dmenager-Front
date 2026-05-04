<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import MobileBottomNav from '../components/mobile/MobileBottomNav.vue';
import MobileQuickCreateSheet from '../components/mobile/quick-create/MobileQuickCreateSheet.vue';
import { useSessionChatNotifications } from '../composables/session/useSessionChatNotifications';
import { useAuthStore } from '../store/authStore';

const route = useRoute();
const authStore = useAuthStore();
const isCreateOpen = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const isSessionRoute = computed(() => {
  return route.name === 'session-detail' || route.name === 'dm-session-detail';
});
const currentSessionId = computed(() => {
  if (!isSessionRoute.value) {
    return null;
  }

  const parsed = Number(route.params.id);
  return Number.isNaN(parsed) ? null : parsed;
});
const activeSessionTab = computed(() => (typeof route.query.tab === 'string' ? route.query.tab : 'events'));
const currentUserId = computed(() => authStore.profile?.id ?? null);

const { unreadWhispers, unreadChat } = useSessionChatNotifications({
  sessionId: currentSessionId,
  activeTab: activeSessionTab,
  currentUserId,
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
      badgeCount:
        tab.key === 'chat'
          ? unreadChat.value
          : tab.key === 'whispers'
            ? unreadWhispers.value
            : 0,
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
              <h2 class="card-title">Crea Rapida</h2>
            </div>
            <button type="button" class="btn btn-secondary" @click="closeCreateOverlay">
              Chiudi
            </button>
          </header>

          <MobileQuickCreateSheet />
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
