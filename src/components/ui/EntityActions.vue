<script setup lang="ts">
import IconActionButton from './IconActionButton.vue';

type SizeName = 'sm' | 'md';
type AlignName = 'start' | 'center' | 'end';

const props = withDefaults(defineProps<{
  canEdit?: boolean;
  canDelete?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  editLoading?: boolean;
  deleteLoading?: boolean;
  size?: SizeName;
  align?: AlignName;
}>(), {
  canEdit: true,
  canDelete: true,
  editLabel: 'Modifica',
  deleteLabel: 'Elimina',
  editDisabled: false,
  deleteDisabled: false,
  editLoading: false,
  deleteLoading: false,
  size: 'sm',
  align: 'end',
});

const emit = defineEmits<{
  (e: 'edit', event: MouseEvent): void;
  (e: 'delete', event: MouseEvent): void;
}>();
</script>

<template>
  <div class="entity-actions" :class="`entity-actions--${props.align}`">
    <IconActionButton
      v-if="props.canEdit"
      icon="edit"
      variant="edit"
      :label="props.editLabel"
      :size="props.size"
      :disabled="props.editDisabled"
      :loading="props.editLoading"
      @click="emit('edit', $event)"
    />
    <IconActionButton
      v-if="props.canDelete"
      icon="delete"
      variant="danger"
      :label="props.deleteLabel"
      :size="props.size"
      :disabled="props.deleteDisabled"
      :loading="props.deleteLoading"
      @click="emit('delete', $event)"
    />
  </div>
</template>

<style scoped>
.entity-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 100%;
}

.entity-actions--start {
  justify-content: flex-start;
}

.entity-actions--center {
  justify-content: center;
}

.entity-actions--end {
  justify-content: flex-end;
}
</style>
