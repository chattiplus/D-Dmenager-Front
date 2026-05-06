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
  <article class="card muted stack campaign-info-card">
    <header class="campaign-detail-header">
      <div class="campaign-detail-title-row">
        <div class="campaign-detail-title-block">
          <span :class="['campaign-status-badge', campaignStatusClass(campaign.status)]">
            {{ campaignStatusLabel(campaign.status) }}
          </span>
          <h2 class="card-title campaign-detail-title">{{ campaign.name }}</h2>
        </div>
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
    </header>

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
      <p class="campaign-description">{{ campaign.description || 'Nessuna descrizione.' }}</p>
      <p class="campaign-meta">
        Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
      </p>
      <p class="campaign-meta">World ID: {{ campaign.worldId }}</p>
    </template>
  </article>
</template>

<style scoped>
.campaign-info-card {
  gap: 0.8rem;
  padding: 1rem 1.1rem;
}

.campaign-detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.campaign-detail-title-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  min-width: 0;
  flex: 1 1 auto;
}

.campaign-detail-title {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.campaign-detail-title-block .campaign-status-badge {
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
  align-self: flex-start;
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
  gap: 0.85rem;
  padding: 0.95rem;
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

.campaign-description {
  margin: 0;
}

.campaign-meta {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.92rem;
  line-height: 1.4;
}

@media (max-width: 640px) {
  .campaign-detail-title-row {
    gap: 0.6rem;
  }
}
</style>
