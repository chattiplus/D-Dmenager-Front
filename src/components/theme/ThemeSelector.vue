<script setup lang="ts">
import { useTheme } from '../../composables/useTheme';
import type { ThemeId } from '../../theme/themes';

const { availableThemes, currentThemeId, setTheme } = useTheme();

const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setTheme(target.value as ThemeId);
};
</script>

<template>
  <label class="theme-selector">
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
</template>

<style scoped>
.theme-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.theme-selector__label {
  font-size: 0.82rem;
  color: var(--app-text-muted);
  white-space: nowrap;
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

@media (max-width: 960px) {
  .theme-selector {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .theme-selector {
    justify-content: stretch;
  }

  .theme-selector__control {
    min-width: 0;
    width: 100%;
  }
}
</style>
