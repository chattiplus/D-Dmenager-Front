<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  color?: string;
  opacity?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'sm' | 'md' | 'lg';
}>(), {
  color: 'currentColor',
  opacity: 1,
  position: 'top-left',
  size: 'md',
});

const classes = computed(() => [
  'arcane-corner',
  `arcane-corner--${props.position}`,
  `arcane-corner--${props.size}`,
]);

const cssVars = computed(() => ({
  '--arcane-corner-color': props.color,
  '--arcane-corner-opacity': String(props.opacity),
}));
</script>

<template>
  <svg
    :class="classes"
    :style="cssVars"
    viewBox="0 0 52 52"
    fill="none"
    aria-hidden="true"
  >
    <path d="M2 50 L2 10 Q2 2 10 2 L50 2" />
    <path d="M6 50 L6 14 Q6 6 14 6 L50 6" class="arcane-corner__echo" />
    <circle cx="2" cy="2" r="3" class="arcane-corner__gem" />
    <circle cx="11" cy="2" r="1.2" class="arcane-corner__dot" />
    <circle cx="2" cy="11" r="1.2" class="arcane-corner__dot" />
    <path d="M2 24 Q9 17 16 24" class="arcane-corner__curve" />
    <path d="M24 2 Q17 9 24 16" class="arcane-corner__curve" />
  </svg>
</template>

<style scoped>
.arcane-corner {
  color: var(--arcane-corner-color);
  opacity: var(--arcane-corner-opacity);
  position: absolute;
  width: 52px;
  height: 52px;
  pointer-events: none;
  stroke: currentColor;
}

.arcane-corner path {
  stroke: currentColor;
  fill: none;
  stroke-linecap: round;
}

.arcane-corner path:first-of-type {
  stroke-width: 1.8;
}

.arcane-corner__echo {
  stroke-width: 0.6;
  opacity: 0.4;
}

.arcane-corner__gem,
.arcane-corner__dot {
  fill: currentColor;
}

.arcane-corner__gem {
  opacity: 0.85;
}

.arcane-corner__dot {
  opacity: 0.45;
}

.arcane-corner__curve {
  stroke-width: 1.1;
  opacity: 0.55;
}

.arcane-corner--top-left {
  top: 0;
  left: 0;
}

.arcane-corner--top-right {
  top: 0;
  right: 0;
  transform: scaleX(-1);
}

.arcane-corner--bottom-left {
  bottom: 0;
  left: 0;
  transform: scaleY(-1);
}

.arcane-corner--bottom-right {
  right: 0;
  bottom: 0;
  transform: scale(-1, -1);
}

.arcane-corner--sm {
  width: 36px;
  height: 36px;
}

.arcane-corner--md {
  width: 52px;
  height: 52px;
}

.arcane-corner--lg {
  width: 68px;
  height: 68px;
}
</style>
