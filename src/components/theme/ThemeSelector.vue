<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'compact' | 'card';
}>(), {
  variant: 'compact',
});

import { useTheme } from '../../composables/useTheme';
import type { ThemeId } from '../../theme/themes';

const { availableThemes, currentThemeId, setTheme } = useTheme();

const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setTheme(target.value as ThemeId);
};
</script>

<template>
  <div class="theme-selector" :class="`theme-selector--${variant}`">
    <label class="theme-selector__field">
      <span class="theme-selector__label">Tema</span>
      <select
        class="theme-selector__control"
        :value="currentThemeId"
        aria-label="Seleziona tema"
        @change="handleThemeChange"
      >
        <option v-for="theme in availableThemes" :key="theme.id" :value="theme.id">
          {{ theme.label }}
        </option>
      </select>
    </label>
    <p v-if="variant === 'card'" class="theme-selector__hint">
      Il tema si applica subito e resta salvato su questo dispositivo.
    </p>
  </div>
</template>

<style scoped>
.theme-selector {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.theme-selector__field {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.theme-selector__label {
  font-size: 0.82rem;
  color: var(--app-kicker-color, var(--app-text-muted));
  white-space: nowrap;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.theme-selector__hint {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.85rem;
}

.theme-selector__control {
  min-width: 8.5rem;
  border-radius: 999px;
  border: 1px solid var(--app-input-border);
  background: var(--app-input-bg);
  color: var(--app-text);
  padding: 0.55rem 0.9rem;
  font-size: 0.9rem;
}

.theme-selector__control:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-accent) 24%, transparent);
}

.theme-selector--card {
  align-items: stretch;
}

.theme-selector--card .theme-selector__field {
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}

.theme-selector--card .theme-selector__control {
  min-height: 3.1rem;
  width: 100%;
  border-radius: 1rem;
  padding: 0.85rem 1rem;
  font-size: 1rem;
}

@media (max-width: 960px) {
  .theme-selector {
    width: 100%;
  }

  .theme-selector--compact .theme-selector__field {
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .theme-selector__control {
    min-width: 0;
    width: 100%;
  }
}
</style>
