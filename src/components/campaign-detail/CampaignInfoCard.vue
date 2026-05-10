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
  canDelete: boolean;
  isEditing: boolean;
  editForm: {
    name: string;
    description: string;
    status: CampaignResponse['status'];
  };
  saving: boolean;
  deleteLoading: boolean;
  errorMessage: string;
}>();

const emit = defineEmits<{
  (e: 'start-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'save-edit'): void;
  (e: 'delete'): void;
}>();
</script>

<template>
  <article class="card muted stack campaign-info-card">
    <header class="campaign-summary-top campaign-info-card__header">
      <div class="campaign-summary-main campaign-summary-header campaign-info-card__main">
        <div class="campaign-summary-title-wrap">
          <div class="campaign-summary-title-row campaign-info-card__title-line">
            <h2 class="card-title campaign-summary-title campaign-info-card__title">{{ campaign.name }}</h2>
            <IconActionButton
              v-if="canEdit && !isEditing"
              class="session-edit-button campaign-edit-button icon-button campaign-info-card__icon-button"
              icon="edit"
              label="Modifica campagna"
              variant="edit"
              size="sm"
              @click="emit('start-edit')"
            />
            <IconActionButton
              v-if="canDelete && !isEditing"
              class="session-edit-button campaign-edit-button icon-button campaign-info-card__icon-button"
              icon="delete"
              label="Elimina campagna"
              variant="danger"
              size="sm"
              :loading="deleteLoading"
              @click="emit('delete')"
            />
            <button
              v-else-if="canEdit"
              type="button"
              class="session-edit-button campaign-edit-button campaign-info-card__cancel-button"
              @click="emit('cancel-edit')"
            >
              Annulla
            </button>
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
          {{ saving ? 'Salvataggio...' : 'Salva modifiche' }}
        </button>
      </div>
      <p v-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>
    </form>
    <template v-else>
      <section class="campaign-info-card__description">
        <p>{{ campaign.description || 'Nessuna descrizione.' }}</p>
      </section>
      <div class="campaign-summary-meta campaign-info-card__meta">
        <p class="campaign-summary-meta-item campaign-info-card__meta-item">
          Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
        </p>
        <p class="campaign-summary-meta-item campaign-info-card__meta-item">World ID: {{ campaign.worldId }}</p>
      </div>
    </template>
  </article>
</template>

<style scoped>
.campaign-info-card {
  gap: 1rem;
  padding: clamp(1rem, 2vw, 1.45rem);
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 78%, transparent);
  border-radius: 1.2rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 80%, var(--app-surface));
  box-shadow: 0 14px 32px color-mix(in srgb, var(--app-shadow) 30%, transparent);
}

.campaign-info-card__header {
  gap: 1rem;
}

.campaign-info-card__main {
  width: 100%;
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
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.65rem;
  min-width: 0;
  max-width: 100%;
}

.campaign-summary-title {
  flex: 1 1 14rem;
  margin: 0;
  min-width: 0;
  color: var(--app-text);
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1.08;
  overflow-wrap: break-word;
  word-break: normal;
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
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-shadow) 36%, transparent);
}

.campaign-info-card__cancel-button {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  font-weight: 800;
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

.campaign-info-card__description {
  padding: 0.85rem 0;
  border-top: 1px solid color-mix(in srgb, var(--app-surface-outline) 52%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--app-surface-outline) 52%, transparent);
}

.campaign-info-card__description p {
  margin: 0;
  color: var(--app-text);
  line-height: 1.55;
  overflow-wrap: break-word;
}

.campaign-summary-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.campaign-summary-meta-item {
  margin: 0;
  min-width: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 62%, transparent);
  border-radius: 0.95rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 74%, transparent);
  color: var(--app-text-muted);
  font-size: 0.92rem;
  line-height: 1.4;
  overflow-wrap: break-word;
}

@media (max-width: 640px) {
  .campaign-info-card {
    padding: 0.95rem;
    border-radius: 1rem;
  }

  .campaign-summary-header {
    gap: 0.75rem;
  }

  .campaign-summary-title-row {
    align-items: flex-start;
  }

  .campaign-summary-title {
    flex-basis: 100%;
    font-size: 1.45rem;
  }

  .campaign-summary-meta {
    grid-template-columns: 1fr;
  }
}
</style>
