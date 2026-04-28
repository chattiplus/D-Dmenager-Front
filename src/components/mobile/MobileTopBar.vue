<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

const props = defineProps<{
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: RouteLocationRaw | null;
}>();

const router = useRouter();

const handleBack = async () => {
  if (props.backTo) {
    await router.push(props.backTo);
    return;
  }

  router.back();
};
</script>

<template>
  <header class="mobile-topbar">
    <button
      v-if="showBack"
      type="button"
      class="mobile-topbar__back"
      aria-label="Torna indietro"
      @click="handleBack"
    >
      ←
    </button>

    <div class="mobile-topbar__body" :class="{ 'with-back': showBack }">
      <p v-if="subtitle" class="mobile-topbar__subtitle">{{ subtitle }}</p>
      <h1 class="mobile-topbar__title">{{ title }}</h1>
    </div>
  </header>
</template>

<style scoped>
.mobile-topbar {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: center;
  padding:
    calc(0.9rem + env(safe-area-inset-top, 0px))
    calc(1rem + env(safe-area-inset-right, 0px))
    0.5rem
    calc(1rem + env(safe-area-inset-left, 0px));
}

.mobile-topbar__back {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  font-size: 1.2rem;
}

.mobile-topbar__body {
  min-width: 0;
}

.mobile-topbar__body.with-back {
  padding-right: 0.5rem;
}

.mobile-topbar__subtitle {
  margin: 0 0 0.15rem;
  color: var(--color-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mobile-topbar__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.55rem;
  line-height: 1.1;
}
</style>
