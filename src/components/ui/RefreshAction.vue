<script setup lang="ts">
import IconActionButton from './IconActionButton.vue';

type SizeName = 'sm' | 'md';

withDefaults(defineProps<{
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  size?: SizeName;
  compact?: boolean;
}>(), {
  label: 'Aggiorna',
  disabled: false,
  loading: false,
  size: 'sm',
  compact: true,
});

const emit = defineEmits<{
  (e: 'refresh', event: MouseEvent): void;
}>();
</script>

<template>
  <div class="refresh-action" :class="{ 'refresh-action--compact': compact }">
    <IconActionButton
      icon="refresh"
      variant="refresh"
      :label="label"
      :size="size"
      :disabled="disabled"
      :loading="loading"
      @click="emit('refresh', $event)"
    />
  </div>
</template>

<style scoped>
.refresh-action {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.refresh-action--compact {
  gap: 0;
}
</style>
