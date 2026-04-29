<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  color?: string;
  opacity?: number;
  variant: 'hp' | 'temp-hp' | 'ac' | 'speed' | 'dice';
}>(), {
  color: 'currentColor',
  opacity: 1,
});

const cssVars = computed(() => ({
  '--arcane-icon-color': props.color,
  '--arcane-icon-opacity': String(props.opacity),
}));
</script>

<template>
  <svg
    class="arcane-stat-icon"
    :style="cssVars"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      v-if="variant === 'hp' || variant === 'temp-hp'"
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
      :class="variant === 'temp-hp' ? 'arcane-stat-icon__temp-fill' : 'arcane-stat-icon__fill'"
    />
    <path
      v-else-if="variant === 'ac'"
      d="M12 2L3 6v6c0 5.25 3.75 10.14 9 11.25C17.25 22.14 21 17.25 21 12V6L12 2z"
      class="arcane-stat-icon__fill"
    />
    <path
      v-else-if="variant === 'speed'"
      d="M5 20h14v-2l-3-3V8a4 4 0 0 0-8 0v7l-3 3v2z"
      class="arcane-stat-icon__fill"
    />
    <template v-else>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </template>
  </svg>
</template>

<style scoped>
.arcane-stat-icon {
  width: 1.05rem;
  height: 1.05rem;
  color: var(--arcane-icon-color);
  opacity: var(--arcane-icon-opacity);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex: 0 0 auto;
}

.arcane-stat-icon__fill {
  fill: color-mix(in srgb, currentColor 13%, transparent);
}

.arcane-stat-icon__temp-fill {
  fill: color-mix(in srgb, currentColor 18%, transparent);
}
</style>
