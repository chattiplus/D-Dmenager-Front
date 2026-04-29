<script setup lang="ts">
import { ref } from 'vue';
import { useIsMobile } from '../../composables/useIsMobile';
import Dice3DPanel from '../dice/Dice3DPanel.vue';
import ArcaneCorner from '../theme/arcane/ArcaneCorner.vue';
import ArcaneStatIcon from '../theme/arcane/ArcaneStatIcon.vue';

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
  <Teleport to="body">
    <div class="session-dice-floating-root" :class="{ 'is-open': isOpen, 'is-mobile': isMobile }">
      <button
        class="session-dice-tab arcane-dice-tab"
        data-dice-source="session-dice-drawer"
        :aria-expanded="isOpen"
        aria-controls="session-dice-panel"
        type="button"
        @click="toggleDrawer"
      >
        <span class="session-dice-tab__label arcane-dice-tab__content">
          <ArcaneStatIcon class="arcane-dice-tab__glyph arcane-only" variant="dice" color="var(--arcane-gold)" />
          <span class="arcane-dice-tab__label">DADI</span>
        </span>
      </button>

      <transition name="session-dice-drawer-fade">
        <button
          v-if="isOpen && isMobile"
          class="session-dice-panel__backdrop"
          type="button"
          aria-label="Chiudi pannello dadi"
          @click="closeDrawer"
        />
      </transition>

      <aside
        id="session-dice-panel"
        class="session-dice-panel arcane-dice-panel"
        data-dice-source="session-dice-drawer"
        :aria-hidden="!isOpen"
      >
        <ArcaneCorner class="arcane-only" color="var(--arcane-gold)" position="top-left" size="sm" />
        <ArcaneCorner class="arcane-only" color="var(--arcane-gold)" position="top-right" size="sm" />
        <div class="session-dice-panel__header arcane-dice-panel__header">
          <h2 class="session-dice-panel__title arcane-dice-panel__title">Dadi</h2>
          <button class="session-dice-panel__close arcane-dice-panel__close" type="button" @click="closeDrawer">
            Chiudi
          </button>
        </div>

        <Dice3DPanel compact />
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.session-dice-floating-root {
  --session-dice-right: max(0px, env(safe-area-inset-right, 0px));
  --session-dice-top: 70vh;
  --session-dice-panel-right: calc(12px + env(safe-area-inset-right, 0px));
  --session-dice-panel-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  position: fixed;
  inset: 0;
  z-index: 1200;
  pointer-events: none;
}

.session-dice-tab {
  position: fixed;
  right: var(--session-dice-right);
  top: var(--session-dice-top);
  transform: translateY(-50%);
  border: 1px solid var(--dice-drawer-border);
  border-radius: 1rem 0 0 1rem;
  background: var(--dice-drawer-bg);
  color: var(--app-text);
  padding: 0.9rem 0.55rem;
  min-width: 0;
  max-width: 3.4rem;
  box-shadow: 0 14px 30px color-mix(in srgb, var(--app-shadow) 78%, transparent);
  cursor: pointer;
  z-index: 2;
  pointer-events: auto;
}

.session-dice-tab__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.session-dice-panel__backdrop {
  position: fixed;
  inset: 0;
  border: none;
  background: var(--app-overlay);
  z-index: 0;
  pointer-events: auto;
}

.session-dice-panel {
  position: fixed;
  right: var(--session-dice-panel-right);
  left: auto;
  bottom: var(--session-dice-panel-bottom);
  width: min(24rem, calc(100vw - 5rem));
  max-width: calc(100vw - 5rem);
  max-height: min(34rem, calc(100vh - 8rem));
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 1rem 1.15rem;
  border-radius: 1.25rem;
  border: 1px solid var(--dice-drawer-border);
  background: var(--dice-drawer-bg);
  box-shadow: 0 20px 50px color-mix(in srgb, var(--app-shadow) 90%, transparent);
  backdrop-filter: blur(16px);
  transform: translateY(calc(100% + 1rem));
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 1;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.session-dice-panel::-webkit-scrollbar {
  display: none;
}

.session-dice-floating-root.is-open .session-dice-panel {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.session-dice-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.session-dice-panel__title {
  margin: 0;
  font-size: 1rem;
}

.session-dice-panel__close {
  border: 1px solid var(--app-input-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-bg-soft) 65%, transparent);
  color: var(--app-text);
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
  .session-dice-floating-root {
    --session-dice-right: 0px;
    --session-dice-top: 70vh;
    --session-dice-panel-right: 12px;
    --session-dice-panel-bottom: 1rem;
  }

  .session-dice-panel {
    width: min(25rem, calc(100vw - 6rem));
    max-height: min(36rem, calc(100vh - 5rem));
  }
}

@media (max-width: 768px) {
  .session-dice-floating-root {
    --session-dice-right: max(0px, env(safe-area-inset-right, 0px));
    --session-dice-top: 70vh;
    --session-dice-panel-right: calc(12px + env(safe-area-inset-right, 0px));
    --session-dice-panel-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  }

  .session-dice-tab {
    padding: 0.86rem 0.5rem;
  }

  .session-dice-panel {
    max-height: calc(100vh - 7.8rem);
  }
}

@media (max-width: 430px) {
  .session-dice-floating-root {
    --session-dice-right: max(0px, env(safe-area-inset-right, 0px));
    --session-dice-top: 72vh;
    --session-dice-panel-right: calc(8px + env(safe-area-inset-right, 0px));
    --session-dice-panel-bottom: calc(84px + env(safe-area-inset-bottom, 0px));
  }

  .session-dice-panel {
    width: min(22rem, calc(100vw - 4rem));
    max-width: calc(100vw - 4rem);
    padding: 0.9rem 0.9rem 1rem;
  }
}
</style>
