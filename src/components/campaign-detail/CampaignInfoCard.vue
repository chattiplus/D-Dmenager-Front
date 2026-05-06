<script setup lang="ts">
import type { CampaignResponse } from '../../types/api';
import {
  CAMPAIGN_STATUS_VALUES,
  campaignStatusClass,
  campaignStatusLabel,
} from '../../utils/campaignStatus';
import IconActionButton from '../ui/IconActionButton.vue';

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
    <header class="campaign-summary-top">
      <div class="campaign-summary-main campaign-summary-header">
        <div class="campaign-summary-title-wrap">
          <div class="campaign-summary-title-row">
            <h2 class="card-title campaign-summary-title">{{ campaign.name }}</h2>
            <IconActionButton
              v-if="canEdit && !isEditing"
              class="session-edit-button campaign-edit-button icon-button"
              icon="edit"
              label="Modifica campagna"
              variant="edit"
              size="sm"
              @click="emit('start-edit')"
            />
          </div>
        </div>
        <span
          :class="['campaign-status-badge', campaignStatusClass(campaign.status)]"
          class="campaign-summary-status"
        >
          {{ campaignStatusLabel(campaign.status) }}
        </span>
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
      <p class="campaign-summary-description">{{ campaign.description || 'Nessuna descrizione.' }}</p>
      <div class="campaign-summary-meta">
        <p class="campaign-summary-meta-item">
          Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
        </p>
        <p class="campaign-summary-meta-item">World ID: {{ campaign.worldId }}</p>
      </div>
    </template>
  </article>
</template>

<style scoped>
.campaign-info-card {
  gap: 0.65rem;
  padding: 0.95rem 1.05rem;
}

.campaign-summary-top,
.campaign-summary-main {
  min-width: 0;
}

.campaign-summary-main {
  display: flex;
  gap: 0.6rem;
}

.campaign-summary-header {
  align-items: flex-start;
  justify-content: space-between;
}

.campaign-summary-title-wrap {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
}

.campaign-summary-title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  max-width: 100%;
}

.campaign-summary-title {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.campaign-summary-status {
  flex-shrink: 0;
  align-self: flex-start;
}

.session-edit-button {
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
  gap: 0.85rem;
  padding: 0.9rem;
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

.campaign-summary-description {
  margin: 0;
  line-height: 1.45;
}

.campaign-summary-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.campaign-summary-meta-item {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.92rem;
  line-height: 1.4;
}

@media (max-width: 640px) {
  .campaign-summary-title-row {
    align-items: flex-start;
  }
}
</style>
