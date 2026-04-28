<script setup lang="ts">
import { ref } from 'vue';
import Dice3DPanel from '../dice/Dice3DPanel.vue';

const isOpen = ref(false);

const toggleDrawer = () => {
  isOpen.value = !isOpen.value;
};

const closeDrawer = () => {
  isOpen.value = false;
};
</script>

<template>
  <div class="session-dice-drawer" :class="{ 'is-open': isOpen }">
    <button
      class="session-dice-drawer__toggle"
      type="button"
      :aria-expanded="isOpen"
      aria-controls="session-dice-panel"
      @click="toggleDrawer"
    >
      <span class="session-dice-drawer__toggle-icon">🎲</span>
      <span class="session-dice-drawer__toggle-label">Dadi</span>
    </button>

    <transition name="session-dice-drawer-fade">
      <button
        v-if="isOpen"
        class="session-dice-drawer__backdrop"
        type="button"
        aria-label="Chiudi pannello dadi"
        @click="closeDrawer"
      />
    </transition>

    <aside id="session-dice-panel" class="session-dice-drawer__panel" :aria-hidden="!isOpen">
      <div class="session-dice-drawer__panel-header">
        <div>
          <p class="session-dice-drawer__eyebrow">Sessione</p>
          <h2 class="session-dice-drawer__title">Dice Drawer</h2>
        </div>
        <button class="session-dice-drawer__close" type="button" @click="closeDrawer">
          Chiudi
        </button>
      </div>

      <Dice3DPanel title="Dado 3D" compact />
    </aside>
  </div>
</template>

<style scoped>
.session-dice-drawer {
  position: fixed;
  top: max(5.5rem, calc(env(safe-area-inset-top, 0px) + 4.5rem));
  right: 0;
  z-index: 70;
  pointer-events: none;
}

.session-dice-drawer__toggle {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-right: 0;
  border-radius: 16px 0 0 16px;
  background:
    linear-gradient(180deg, rgba(25, 23, 53, 0.96), rgba(57, 18, 23, 0.96));
  color: #f8fafc;
  padding: 0.75rem 0.9rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  cursor: pointer;
}

.session-dice-drawer__toggle-label {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.session-dice-drawer__toggle-icon {
  font-size: 1rem;
}

.session-dice-drawer__backdrop {
  position: fixed;
  inset: 0;
  pointer-events: auto;
  border: 0;
  background: rgba(3, 7, 18, 0.28);
}

.session-dice-drawer__panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100dvh;
  width: min(380px, calc(100vw - 1rem));
  padding:
    max(1rem, env(safe-area-inset-top, 0px))
    max(1rem, env(safe-area-inset-right, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px))
    1rem;
  transform: translateX(100%);
  transition: transform 0.24s ease-out;
  pointer-events: auto;
  background:
    linear-gradient(180deg, rgba(10, 14, 24, 0.98), rgba(24, 14, 28, 0.98));
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: -18px 0 48px rgba(0, 0, 0, 0.35);
  overflow-y: auto;
}

.session-dice-drawer.is-open .session-dice-drawer__panel {
  transform: translateX(0);
}

.session-dice-drawer__panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.session-dice-drawer__eyebrow {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(226, 232, 240, 0.55);
  margin-bottom: 0.3rem;
}

.session-dice-drawer__title {
  font-size: 1.1rem;
  font-weight: 700;
}

.session-dice-drawer__close {
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  padding: 0.65rem 0.9rem;
  cursor: pointer;
}

.session-dice-drawer-fade-enter-active,
.session-dice-drawer-fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.session-dice-drawer-fade-enter-from,
.session-dice-drawer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .session-dice-drawer {
    top: max(4.75rem, calc(env(safe-area-inset-top, 0px) + 3.75rem));
  }

  .session-dice-drawer__toggle {
    padding: 0.7rem 0.75rem;
  }

  .session-dice-drawer__panel {
    width: min(100vw, 360px);
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px) + 5rem);
  }
}
</style>
