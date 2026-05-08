<script setup lang="ts">
import { computed } from 'vue';

type IconName = 'edit' | 'delete' | 'refresh' | 'view' | 'close';
type VariantName = 'default' | 'edit' | 'danger' | 'refresh' | 'ghost' | 'secondary';
type SizeName = 'sm' | 'md';
type ButtonType = 'button' | 'submit' | 'reset';

const props = withDefaults(defineProps<{
  icon: IconName;
  label: string;
  variant?: VariantName;
  size?: SizeName;
  disabled?: boolean;
  loading?: boolean;
  type?: ButtonType;
}>(), {
  variant: 'default',
  size: 'sm',
  disabled: false,
  loading: false,
  type: 'button',
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const iconGlyphs: Record<IconName, string> = {
  edit: '✎',
  delete: '🗑',
  refresh: '↻',
  view: '👁',
  close: '×',
};

const resolvedDisabled = computed(() => props.disabled || props.loading);

const buttonClass = computed(() => [
  'icon-action-button',
  `icon-action-button--${props.variant}`,
  `icon-action-button--${props.size}`,
  {
    'is-disabled': resolvedDisabled.value,
    'is-loading': props.loading,
  },
]);

const iconLabel = computed(() => iconGlyphs[props.icon]);

const handleClick = (event: MouseEvent) => {
  if (resolvedDisabled.value) {
    event.preventDefault();
    return;
  }
  emit('click', event);
};
</script>

<template>
  <button
    :type="type"
    :class="buttonClass"
    :aria-label="label"
    :title="label"
    :disabled="resolvedDisabled"
    @click="handleClick"
  >
    <span v-if="loading" class="icon-action-button__spinner" aria-hidden="true"></span>
    <span v-else class="icon-action-button__icon" aria-hidden="true">{{ iconLabel }}</span>
  </button>
</template>

<style scoped>
.icon-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  color: var(--app-text);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-shadow) 45%, transparent);
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.icon-action-button:hover:not(:disabled),
.icon-action-button:focus-visible {
  border-color: color-mix(in srgb, var(--app-accent) 42%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 12%, var(--app-surface));
  box-shadow: 0 10px 22px color-mix(in srgb, var(--app-shadow) 52%, transparent);
  outline: none;
}

.icon-action-button:active:not(:disabled) {
  transform: translateY(1px);
}

.icon-action-button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
  box-shadow: none;
}

.icon-action-button--default {
  color: var(--app-text);
}

.icon-action-button--edit {
  border-color: color-mix(in srgb, var(--app-accent) 36%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-elevated));
}

.icon-action-button--danger {
  border-color: color-mix(in srgb, var(--app-danger, #b91c1c) 34%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-danger, #b91c1c) 10%, var(--app-surface-elevated));
}

.icon-action-button--refresh {
  border-color: color-mix(in srgb, var(--app-accent-strong) 40%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent-strong) 12%, var(--app-surface-elevated));
  color: var(--app-accent-strong);
}

.icon-action-button--ghost {
  background: transparent;
  box-shadow: none;
}

.icon-action-button--secondary {
  background: color-mix(in srgb, var(--app-surface) 84%, var(--app-surface-elevated));
  color: var(--app-text-muted);
}

.icon-action-button--sm {
  width: 2.35rem;
  min-width: 2.35rem;
  min-height: 2.35rem;
  padding: 0;
  font-size: 1rem;
}

.icon-action-button--md {
  width: 2.8rem;
  min-width: 2.8rem;
  min-height: 2.8rem;
  padding: 0;
  font-size: 1.15rem;
}

.icon-action-button__icon,
.icon-action-button__spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.icon-action-button__spinner {
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--app-text-muted) 42%, transparent);
  border-top-color: var(--app-accent-strong);
  animation: icon-action-button-spin 0.7s linear infinite;
}

@keyframes icon-action-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
