<script setup lang="ts">
import { ref } from 'vue';
import { useIsMobile } from '../../composables/useIsMobile';
import Dice3DPanel from '../dice/Dice3DPanel.vue';

const isOpen = ref(false);
const { isMobile } = useIsMobile();

const toggleDrawer = () => {
  isOpen.value = !isOpen.value;
};

const closeDrawer = () => {
  isOpen.value = false;
};
</script>

<template>
  <div class="session-dice-drawer" :class="{ 'is-open': isOpen, 'is-mobile': isMobile }">
    <button
      class="session-dice-drawer__toggle"
      :aria-expanded="isOpen"
      aria-controls="session-dice-drawer-panel"
      type="button"
      @click="toggleDrawer"
    >
      <span class="session-dice-drawer__toggle-label">Dadi</span>
    </button>

    <transition name="session-dice-drawer-fade">
      <button
        v-if="isOpen && isMobile"
        class="session-dice-drawer__backdrop"
        type="button"
        aria-label="Chiudi pannello dadi"
        @click="closeDrawer"
      />
    </transition>

    <aside
      id="session-dice-drawer-panel"
      class="session-dice-drawer__panel"
      :aria-hidden="!isOpen"
    >
      <div class="session-dice-drawer__panel-header">
        <h2 class="session-dice-drawer__title">Dadi</h2>
        <button class="session-dice-drawer__close" type="button" @click="closeDrawer">
          Chiudi
        </button>
      </div>

      <Dice3DPanel compact />
    </aside>
  </div>
</template>

<style scoped>
.session-dice-drawer {
  position: fixed;
  right: 0.75rem;
  top: 35vh;
  z-index: 45;
  pointer-events: none;
}

.session-dice-drawer > * {
  pointer-events: auto;
}

.session-dice-drawer__toggle {
  position: relative;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 1rem 0 0 1rem;
  background:
    linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(30, 41, 59, 0.94));
  color: #f8fafc;
  padding: 0.9rem 0.55rem;
  min-width: 0;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.28);
  cursor: pointer;
}

.session-dice-drawer__toggle-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.session-dice-drawer__backdrop {
  position: fixed;
  inset: 0;
  border: none;
  background: rgba(2, 6, 23, 0.38);
}

.session-dice-drawer__panel {
  position: fixed;
  right: 0.75rem;
  left: 0.75rem;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
  width: auto;
  max-width: calc(100vw - 1.5rem);
  max-height: min(34rem, calc(100vh - 8rem));
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 1rem 1.15rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.38);
  backdrop-filter: blur(16px);
  transform: translateY(calc(100% + 1rem));
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
  opacity: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.session-dice-drawer__panel::-webkit-scrollbar {
  display: none;
}

.session-dice-drawer.is-open .session-dice-drawer__panel {
  transform: translateY(0);
  opacity: 1;
}

.session-dice-drawer__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.session-dice-drawer__title {
  margin: 0;
  font-size: 1rem;
}

.session-dice-drawer__close {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.56);
  color: #e2e8f0;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
}

.session-dice-drawer-fade-enter-active,
.session-dice-drawer-fade-leave-active {
  transition: opacity 0.18s ease;
}

.session-dice-drawer-fade-enter-from,
.session-dice-drawer-fade-leave-to {
  opacity: 0;
}

@media (min-width: 769px) {
  .session-dice-drawer {
    display: none;
  }
}

@media (max-width: 768px) {
  .session-dice-drawer {
    right: env(safe-area-inset-right, 0px);
    top: 32dvh;
  }

  .session-dice-drawer__toggle {
    padding: 0.86rem 0.5rem;
  }

  .session-dice-drawer__panel {
    max-height: calc(100vh - 7.8rem);
  }
}

@media (max-width: 430px) {
  .session-dice-drawer {
    right: env(safe-area-inset-right, 0px);
    top: 32dvh;
  }

  .session-dice-drawer__panel {
    right: 0.5rem;
    left: 0.5rem;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem);
    max-width: calc(100vw - 1rem);
    padding: 0.9rem 0.9rem 1rem;
  }
}
</style>
