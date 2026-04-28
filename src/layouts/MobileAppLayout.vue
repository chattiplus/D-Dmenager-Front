<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import MobileBottomNav from '../components/mobile/MobileBottomNav.vue';
import MobileTopBar from '../components/mobile/MobileTopBar.vue';
import { useMobileShell } from '../composables/useMobileShell';
import { useAuthStore } from '../store/authStore';

interface MobileQuickAction {
  label: string;
  to: string;
  description: string;
}

const route = useRoute();
const authStore = useAuthStore();
const { mobileShellState, resetMobileShellState } = useMobileShell();
const createOpen = ref(false);

const isLoginRoute = computed(() => route.name === 'login');

const defaultShell = computed(() => {
  if (route.name === 'mobile-campaigns') {
    return { title: 'Campagne', subtitle: 'Gestione campagne e sessioni' };
  }
  if (route.name === 'mobile-profile') {
    return { title: 'Profilo', subtitle: 'Menu account e strumenti gestionali' };
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

const quickActions = computed<MobileQuickAction[]>(() => {
  const actions: MobileQuickAction[] = [];

  if (authStore.canManageContent) {
    actions.push(
      {
        label: 'Crea campagna',
        to: '/mobile/campaigns',
        description: 'Vai al flusso campagne e usa la creazione esistente.',
      },
      {
        label: 'Crea sessione',
        to: '/mobile/campaigns',
        description: 'Seleziona una campagna e apri la creazione sessione.',
      },
      {
        label: 'Crea NPC',
        to: '/dm/npcs',
        description: 'Apri il punto di ingresso esistente per aggiungere un NPC.',
      },
      {
        label: 'Crea mondo',
        to: '/dm/worlds',
        description: 'Apri il flusso mondi e crea un nuovo contenitore di gioco.',
      },
      {
        label: 'Crea oggetto',
        to: '/dm/items',
        description: 'Apri la gestione oggetti sul form di creazione.',
      },
      {
        label: 'Crea location',
        to: '/dm/locations',
        description: 'Apri la gestione location per aggiungere un nuovo luogo.',
      },
    );
  }

  if (!authStore.isViewerOnly) {
    actions.splice(Math.min(actions.length, 2), 0, {
      label: 'Crea personaggio',
      to: '/player/characters',
      description: 'Apri l area personaggi e crea la nuova scheda.',
    });
  }

  return actions;
});

const handleCreateNavigate = () => {
  createOpen.value = false;
  resetMobileShellState();
};
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

    <transition name="mobile-sheet">
      <div v-if="createOpen && quickActions.length" class="mobile-create-sheet">
        <div class="mobile-create-sheet__scrim" @click="createOpen = false" />
        <section class="mobile-create-sheet__panel">
          <header class="mobile-create-sheet__header">
            <div>
              <p class="mobile-create-sheet__eyebrow">Azioni rapide</p>
              <h2 class="mobile-create-sheet__title">Crea Rapido</h2>
            </div>
            <button type="button" class="mobile-create-sheet__close" @click="createOpen = false">
              x
            </button>
          </header>

          <RouterLink
            v-for="action in quickActions"
            :key="action.label"
            :to="action.to"
            class="mobile-create-sheet__action"
            @click="handleCreateNavigate"
          >
            <strong>{{ action.label }}</strong>
            <span>{{ action.description }}</span>
          </RouterLink>
        </section>
      </div>
    </transition>

    <MobileBottomNav
      v-if="showBottomNav"
      :create-open="createOpen"
      @toggle-create="createOpen = !createOpen"
    />
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
  padding-bottom: calc(6.75rem + env(safe-area-inset-bottom, 0px));
}

.mobile-shell__page {
  width: min(100%, 44rem);
  min-width: 0;
  margin: 0 auto;
  padding:
    0
    calc(1rem + env(safe-area-inset-right, 0px))
    calc(1rem + env(safe-area-inset-bottom, 0px))
    calc(1rem + env(safe-area-inset-left, 0px));
}

.mobile-shell__page :deep(*) {
  min-width: 0;
}

.mobile-create-sheet {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.mobile-create-sheet__scrim {
  position: absolute;
  inset: 0;
  background: rgba(3, 7, 14, 0.55);
  backdrop-filter: blur(10px);
}

.mobile-create-sheet__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: min(78vh, 42rem);
  overflow-y: auto;
  border-radius: 1.6rem 1.6rem 0 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(18, 24, 38, 0.98), rgba(9, 15, 26, 0.98));
  padding:
    1rem
    calc(1rem + env(safe-area-inset-right, 0px))
    calc(1rem + env(safe-area-inset-bottom, 0px))
    calc(1rem + env(safe-area-inset-left, 0px));
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.mobile-create-sheet__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.mobile-create-sheet__eyebrow {
  margin: 0 0 0.15rem;
  color: var(--color-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mobile-create-sheet__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.7rem;
}

.mobile-create-sheet__close {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  font-size: 1.1rem;
}

.mobile-create-sheet__action {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mobile-create-sheet__action strong {
  font-size: 1rem;
}

.mobile-create-sheet__action span {
  color: var(--color-muted);
  font-size: 0.86rem;
}

.mobile-sheet-enter-active,
.mobile-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-sheet-enter-active .mobile-create-sheet__panel,
.mobile-sheet-leave-active .mobile-create-sheet__panel {
  transition: transform 0.2s ease;
}

.mobile-sheet-enter-from,
.mobile-sheet-leave-to {
  opacity: 0;
}

.mobile-sheet-enter-from .mobile-create-sheet__panel,
.mobile-sheet-leave-to .mobile-create-sheet__panel {
  transform: translateY(24px);
}
</style>
