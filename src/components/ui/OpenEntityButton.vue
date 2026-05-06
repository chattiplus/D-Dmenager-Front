<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

type SizeName = 'sm' | 'md';
type VariantName = 'primary' | 'soft' | 'ghost';

const props = withDefaults(defineProps<{
  label?: string;
  to?: RouteLocationRaw | string;
  href?: string;
  disabled?: boolean;
  size?: SizeName;
  variant?: VariantName;
  block?: boolean;
  ariaLabel?: string;
}>(), {
  label: 'Apri',
  to: undefined,
  href: undefined,
  disabled: false,
  size: 'sm',
  variant: 'primary',
  block: false,
  ariaLabel: undefined,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const resolvedLabel = computed(() => props.ariaLabel || props.label);

const classes = computed(() => [
  'open-entity-button',
  `open-entity-button--${props.variant}`,
  `open-entity-button--${props.size}`,
  {
    'open-entity-button--block': props.block,
    'is-disabled': props.disabled,
  },
]);

const mode = computed<'button' | 'router-link' | 'anchor'>(() => {
  if (props.disabled || (!props.to && !props.href)) {
    return 'button';
  }
  if (props.to) {
    return 'router-link';
  }
  return 'anchor';
});

const handleClick = (event: MouseEvent) => {
  if (props.disabled || mode.value !== 'button') {
    event.preventDefault();
    return;
  }
  emit('click', event);
};
</script>

<template>
  <RouterLink
    v-if="mode === 'router-link'"
    :to="to as RouteLocationRaw"
    :class="classes"
    :aria-label="resolvedLabel"
    :title="resolvedLabel"
  >
    <span class="open-entity-button__label">{{ label }}</span>
  </RouterLink>

  <a
    v-else-if="mode === 'anchor'"
    :href="href"
    :class="classes"
    :aria-label="resolvedLabel"
    :title="resolvedLabel"
  >
    <span class="open-entity-button__label">{{ label }}</span>
  </a>

  <button
    v-else
    type="button"
    :class="classes"
    :aria-label="resolvedLabel"
    :title="resolvedLabel"
    :disabled="disabled"
    @click="handleClick"
  >
    <span class="open-entity-button__label">{{ label }}</span>
  </button>
</template>

<style scoped>
.open-entity-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  max-width: 100%;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-surface-outline));
  padding: 0.62rem 1rem;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.1;
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.open-entity-button:hover:not(.is-disabled),
.open-entity-button:focus-visible {
  outline: none;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--app-shadow) 46%, transparent);
}

.open-entity-button--primary {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--app-accent-strong) 88%, var(--app-surface-elevated)),
    color-mix(in srgb, var(--app-accent) 72%, var(--app-surface))
  );
  color: var(--app-text);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--app-shadow) 42%, transparent);
}

.open-entity-button--primary:hover:not(.is-disabled),
.open-entity-button--primary:focus-visible {
  border-color: color-mix(in srgb, var(--app-accent-strong) 62%, var(--app-surface-outline));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--app-accent-strong) 96%, var(--app-surface-elevated)),
    color-mix(in srgb, var(--app-accent) 82%, var(--app-surface))
  );
}

.open-entity-button--soft {
  background: color-mix(in srgb, var(--app-accent) 12%, var(--app-surface-elevated));
  color: var(--app-text);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--app-shadow) 28%, transparent);
}

.open-entity-button--soft:hover:not(.is-disabled),
.open-entity-button--soft:focus-visible {
  background: color-mix(in srgb, var(--app-accent) 20%, var(--app-surface-elevated));
}

.open-entity-button--ghost {
  background: transparent;
  color: var(--app-accent-strong);
  box-shadow: none;
}

.open-entity-button--ghost:hover:not(.is-disabled),
.open-entity-button--ghost:focus-visible {
  background: color-mix(in srgb, var(--app-accent) 10%, transparent);
}

.open-entity-button--sm {
  min-height: 2.35rem;
  padding: 0.58rem 0.95rem;
  font-size: 0.9rem;
}

.open-entity-button--md {
  min-height: 2.75rem;
  padding: 0.72rem 1.2rem;
  font-size: 0.98rem;
}

.open-entity-button--block {
  display: flex;
  width: 100%;
}

.open-entity-button.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
  box-shadow: none;
}

.open-entity-button__label {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
