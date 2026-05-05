<script setup lang="ts">
import type { CampaignResponse } from '../../types/api';
import {
  CAMPAIGN_STATUS_VALUES,
  campaignStatusClass,
  campaignStatusLabel,
} from '../../utils/campaignStatus';

defineProps<{
  campaign: CampaignResponse;
  canEdit: boolean;
  isEditing: boolean;
  editForm: {
    name: string;
    description: string;
    status: CampaignResponse['status'];
  };
  saving: boolean;
  errorMessage: string;
}>();

const emit = defineEmits<{
  (e: 'start-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'save-edit'): void;
}>();
</script>

<template>
  <article class="card muted stack">
    <div class="campaign-detail-title-row">
      <h2 class="card-title campaign-title">{{ campaign.name }}</h2>
      <span :class="['campaign-status-badge', campaignStatusClass(campaign.status)]">
        {{ campaignStatusLabel(campaign.status) }}
      </span>
      <button
        v-if="canEdit && !isEditing"
        type="button"
        class="icon-button campaign-edit-button"
        title="Modifica campagna"
        aria-label="Modifica campagna"
        @click="emit('start-edit')"
      >
        &#9998;
      </button>
    </div>

    <form v-if="isEditing" class="campaign-edit-form" @submit.prevent="emit('save-edit')">
      <label class="field">
        <span>Nome campagna</span>
        <input v-model="editForm.name" type="text" required />
      </label>
      <label class="field">
        <span>Descrizione</span>
        <textarea v-model="editForm.description" rows="6" />
      </label>
      <label class="field">
        <span>Stato campagna</span>
        <select v-model="editForm.status">
          <option v-for="status in CAMPAIGN_STATUS_VALUES" :key="status" :value="status">
            {{ campaignStatusLabel(status) }}
          </option>
        </select>
      </label>
      <div class="campaign-edit-actions">
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Salvataggio...' : 'Salva' }}
        </button>
        <button class="btn btn-link" type="button" @click="emit('cancel-edit')">
          Annulla
        </button>
      </div>
      <p v-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>
    </form>
    <template v-else>
      <p>{{ campaign.description || 'Nessuna descrizione.' }}</p>
      <p class="world-meta">
        Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
      </p>
      <p class="world-meta">World ID: {{ campaign.worldId }}</p>
    </template>
  </article>
</template>

<style scoped>
.campaign-detail-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  flex-wrap: wrap;
}

.campaign-title {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  flex: 1 1 14rem;
}

.campaign-detail-title-row .campaign-status-badge {
  flex-shrink: 0;
}

.campaign-edit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  color: var(--app-text);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-shadow) 45%, transparent);
}

.icon-button {
  width: 2.35rem;
  min-width: 2.35rem;
  padding: 0;
  border-radius: 999px;
  font-size: 1rem;
}

.campaign-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 90%, var(--app-surface));
}

.campaign-edit-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .campaign-detail-title-row {
    align-items: flex-start;
  }
}
</style>
