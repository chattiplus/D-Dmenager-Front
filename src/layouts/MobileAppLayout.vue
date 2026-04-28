<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import MobileBottomNav from '../components/mobile/MobileBottomNav.vue';
import MobileTopBar from '../components/mobile/MobileTopBar.vue';
import { useMobileShell } from '../composables/useMobileShell';
import { useAuthStore } from '../store/authStore';

const route = useRoute();
const authStore = useAuthStore();
const { mobileShellState } = useMobileShell();

const isLoginRoute = computed(() => route.name === 'login');

const defaultShell = computed(() => {
  if (route.name === 'mobile-campaigns') {
    return { title: 'Campagne', subtitle: 'Campagne, sessioni e accesso rapido' };
  }
  if (route.name === 'mobile-create') {
    return { title: 'Crea Rapida', subtitle: 'Azioni operative in formato mobile' };
  }
  if (route.name === 'mobile-profile') {
    return { title: 'Profilo', subtitle: 'Menu account e archivi gestionali' };
  }
  if (route.name === 'dm-worlds') {
    return { title: 'Mondi', subtitle: 'Gestione mondi e campagne' };
  }
  if (route.name === 'dm-npcs') {
    return { title: 'NPC', subtitle: 'Archivio completo NPC' };
  }
  if (route.name === 'dm-locations') {
    return { title: 'Location', subtitle: 'Archivio completo location' };
  }
  if (route.name === 'dm-items') {
    return { title: 'Oggetti', subtitle: 'Archivio completo oggetti' };
  }
  if (route.name === 'dm-join-requests') {
    return { title: 'Richieste', subtitle: 'Gestione richieste campagne' };
  }
  if (route.name === 'player-characters') {
    return { title: 'Personaggi', subtitle: 'Le tue schede giocante' };
  }
  if (route.name === 'player-worlds') {
    return { title: 'Esplora', subtitle: 'Mondi e campagne pubbliche' };
  }
  if (route.name === 'world-detail') {
    return { title: 'Mondo', subtitle: 'Dettaglio e campagne collegate' };
  }
  if (route.name === 'campaign-detail') {
    return { title: 'Campagna', subtitle: 'Dettaglio campagna e sessioni' };
  }
  if (route.name === 'dice-roller') {
    return { title: 'Dadi', subtitle: 'Lancia e condividi i tiri' };
  }

  return {
    title: 'Home',
    subtitle: authStore.canManageContent ? 'Dashboard Dungeon Master' : 'Dashboard giocatore',
  };
});

const topBarTitle = computed(() => mobileShellState.value.title || defaultShell.value.title);
const topBarSubtitle = computed(
  () => mobileShellState.value.subtitle || defaultShell.value.subtitle,
);
const showTopBar = computed(() => authStore.isAuthenticated && !isLoginRoute.value);
const showBottomNav = computed(() => authStore.isAuthenticated && !isLoginRoute.value);
</script>

<template>
  <div class="mobile-shell">
    <MobileTopBar
      v-if="showTopBar"
      :title="topBarTitle"
      :subtitle="topBarSubtitle"
      :show-back="mobileShellState.showBack"
      :back-to="mobileShellState.backTo"
    />

    <main class="mobile-shell__content" :class="{ 'with-nav': showBottomNav }">
      <div class="mobile-shell__page">
        <RouterView />
      </div>
    </main>

    <MobileBottomNav v-if="showBottomNav" />
  </div>
</template>

<style scoped>
.mobile-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
  background:
    radial-gradient(circle at top, rgba(74, 89, 135, 0.26), rgba(6, 10, 18, 0.96) 50%),
    var(--color-bg);
}

.mobile-shell__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  -webkit-overflow-scrolling: touch;
}

.mobile-shell__content.with-nav {
  padding-bottom: calc(6.9rem + env(safe-area-inset-bottom, 0px));
}

.mobile-shell__page {
  width: min(100%, 44rem);
  min-width: 0;
  margin: 0 auto;
  padding:
    0.35rem
    calc(1rem + env(safe-area-inset-right, 0px))
    calc(1.1rem + env(safe-area-inset-bottom, 0px))
    calc(1rem + env(safe-area-inset-left, 0px));
}

.mobile-shell__page :deep(*) {
  min-width: 0;
}

.mobile-shell__page :deep(.card),
.mobile-shell__page :deep(.compact-card) {
  width: 100%;
  overflow-x: clip;
}

.mobile-shell__page :deep(.section-title),
.mobile-shell__page :deep(.card-title) {
  overflow-wrap: anywhere;
}

.mobile-shell__page :deep(.section-subtitle),
.mobile-shell__page :deep(.card-subtitle),
.mobile-shell__page :deep(.manager-meta),
.mobile-shell__page :deep(.world-meta) {
  overflow-wrap: anywhere;
}
</style>
