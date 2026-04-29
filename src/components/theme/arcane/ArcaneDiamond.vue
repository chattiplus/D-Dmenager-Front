<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  color?: string;
  opacity?: number;
  size?: 'sm' | 'md' | 'lg';
}>(), {
  color: 'currentColor',
  opacity: 0.8,
  size: 'md',
});

const classes = computed(() => ['arcane-diamond', `arcane-diamond--${props.size}`]);
const cssVars = computed(() => ({
  '--arcane-diamond-color': props.color,
  '--arcane-diamond-opacity': String(props.opacity),
}));
</script>

<template>
  <svg :class="classes" :style="cssVars" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0 L10 5 L5 10 L0 5 Z" />
  </svg>
</template>

<style scoped>
.arcane-diamond {
  color: var(--arcane-diamond-color);
  opacity: var(--arcane-diamond-opacity);
  display: inline-block;
  fill: currentColor;
  flex: 0 0 auto;
}

.arcane-diamond--sm {
  width: 0.45rem;
  height: 0.45rem;
}

.arcane-diamond--md {
  width: 0.7rem;
  height: 0.7rem;
}

.arcane-diamond--lg {
  width: 0.95rem;
  height: 0.95rem;
}
</style>
