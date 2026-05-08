<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  color?: string;
  opacity?: number;
  variant?: 'compact' | 'full';
}>(), {
  color: 'currentColor',
  opacity: 1,
  variant: 'full',
});

const classes = computed(() => ['arcane-divider', `arcane-divider--${props.variant}`]);
const cssVars = computed(() => ({
  '--arcane-divider-color': props.color,
  '--arcane-divider-opacity': String(props.opacity),
}));
</script>

<template>
  <svg
    :class="classes"
    :style="cssVars"
    viewBox="0 0 340 22"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <line x1="0" y1="11" x2="142" y2="11" />
    <line x1="198" y1="11" x2="340" y2="11" />
    <path d="M156 11 L163 4 L170 11 L163 18 Z" class="arcane-divider__center" />
    <path d="M143 11 L149 7 L155 11 L149 15 Z" class="arcane-divider__side" />
    <path d="M185 11 L191 7 L197 11 L191 15 Z" class="arcane-divider__side" />
    <circle cx="170" cy="11" r="2.5" class="arcane-divider__halo" />
  </svg>
</template>

<style scoped>
.arcane-divider {
  color: var(--arcane-divider-color);
  opacity: var(--arcane-divider-opacity);
  display: block;
  width: 100%;
  height: 1.35rem;
}

.arcane-divider line,
.arcane-divider path,
.arcane-divider circle {
  stroke: currentColor;
}

.arcane-divider line {
  stroke-width: 0.8;
  opacity: 0.5;
}

.arcane-divider__center {
  fill: currentColor;
  stroke: none;
  opacity: 0.9;
}

.arcane-divider__side {
  fill: none;
  stroke-width: 0.9;
  opacity: 0.55;
}

.arcane-divider__halo {
  fill: none;
  stroke-width: 0.6;
  opacity: 0.35;
}

.arcane-divider--compact {
  height: 0.95rem;
}

.arcane-divider--compact line {
  stroke-width: 0.6;
  opacity: 0.3;
}
</style>
