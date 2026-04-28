<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../store/authStore';

type PlayerSessionTab = 'events' | 'chat' | 'whispers' | 'resources' | 'sheet';
type DmSessionTab = 'events' | 'chat' | 'whispers' | 'resources' | 'characters';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isDmSession = computed(() => route.name === 'dm-session-detail');
const isPlayerSession = computed(() => route.name === 'session-detail');
const isSessionRoute = computed(() => isDmSession.value || isPlayerSession.value);
const isCampaignRoute = computed(
  () => route.name === 'mobile-campaigns' || route.name === 'campaign-detail',
);
const isCreateRoute = computed(() => route.name === 'mobile-create');
const isProfileRoute = computed(
  () =>
    route.name === 'mobile-profile' ||
    route.name === 'dm-worlds' ||
    route.name === 'dm-npcs' ||
    route.name === 'dm-items' ||
    route.name === 'dm-locations' ||
    route.name === 'dm-join-requests' ||
    route.name === 'player-characters' ||
    route.name === 'player-worlds',
);

const globalItems = computed(() => [
  {
    key: 'home',
    icon: 'Home',
    label: 'Home',
    active:
      route.path === authStore.defaultRoutePath ||
      route.name === 'dm-dashboard' ||
      route.name === 'player-dashboard',
    action: () => router.push(authStore.defaultRoutePath),
  },
  {
    key: 'campaigns',
    icon: 'Camp',
    label: 'Campagne',
    active: isCampaignRoute.value,
    action: () => router.push({ name: 'mobile-campaigns' }),
  },
  {
    key: 'create',
    icon: 'Crea',
    label: 'Crea',
    active: isCreateRoute.value,
    action: () => router.push({ name: 'mobile-create' }),
  },
  {
    key: 'profile',
    icon: 'Menu',
    label: 'Profilo',
    active: isProfileRoute.value,
    action: () => router.push({ name: 'mobile-profile' }),
  },
]);

const sessionItems = computed(() => {
  const currentTab = typeof route.query.tab === 'string' ? route.query.tab : 'events';
  const tabs: Array<{ key: PlayerSessionTab | DmSessionTab; label: string; icon: string }> =
    isDmSession.value
      ? [
          { key: 'events', label: 'Eventi', icon: 'Log' },
          { key: 'chat', label: 'Chat', icon: 'Chat' },
          { key: 'whispers', label: 'Suss.', icon: 'Priv' },
          { key: 'resources', label: 'Ris.', icon: 'File' },
          { key: 'characters', label: 'Pers.', icon: 'PG' },
        ]
      : [
          { key: 'events', label: 'Eventi', icon: 'Log' },
          { key: 'chat', label: 'Chat', icon: 'Chat' },
          { key: 'whispers', label: 'Suss.', icon: 'Priv' },
          { key: 'resources', label: 'Ris.', icon: 'File' },
          { key: 'sheet', label: 'Scheda', icon: 'Sheet' },
        ];

  return tabs.map((tab) => ({
    ...tab,
    active: currentTab === tab.key || (currentTab === 'events' && tab.key === 'events'),
    action: () =>
      router.replace({
        query: {
          ...route.query,
          tab: tab.key === 'events' ? undefined : tab.key,
        },
      }),
  }));
});
</script>

<template>
  <nav
    class="mobile-bottom-nav"
    :style="{
      gridTemplateColumns: `repeat(${isSessionRoute ? sessionItems.length : globalItems.length}, minmax(0, 1fr))`,
    }"
    aria-label="Navigazione mobile"
  >
    <button
      v-for="item in isSessionRoute ? sessionItems : globalItems"
      :key="item.key"
      type="button"
      class="mobile-bottom-nav__item"
      :class="{ active: item.active }"
      @click="item.action"
    >
      <small class="mobile-bottom-nav__icon">{{ item.icon }}</small>
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  display: grid;
  width: min(100%, 44rem);
  transform: translateX(-50%);
  gap: 0.5rem;
  padding:
    0.75rem
    calc(0.9rem + env(safe-area-inset-right, 0px))
    calc(0.75rem + env(safe-area-inset-bottom, 0px))
    calc(0.9rem + env(safe-area-inset-left, 0px));
  background:
    linear-gradient(180deg, rgba(9, 15, 26, 0.2), rgba(9, 15, 26, 0.98) 28%),
    rgba(9, 15, 26, 0.94);
  backdrop-filter: blur(18px);
  box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.35);
}

.mobile-bottom-nav__item {
  min-width: 0;
  min-height: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-muted);
  border-radius: 1rem;
  padding: 0.6rem 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.mobile-bottom-nav__icon {
  font-size: 0.66rem;
  line-height: 1;
  letter-spacing: 0.03em;
}

.mobile-bottom-nav__item.active {
  color: var(--color-text);
  border-color: rgba(249, 168, 38, 0.5);
  background: linear-gradient(135deg, rgba(249, 168, 38, 0.18), rgba(255, 255, 255, 0.08));
}

.mobile-bottom-nav__item span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 390px) {
  .mobile-bottom-nav__item {
    font-size: 0.63rem;
    padding-inline: 0.18rem;
  }

  .mobile-bottom-nav__icon {
    font-size: 0.58rem;
  }
}
</style>
