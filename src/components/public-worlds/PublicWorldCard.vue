<script setup lang="ts">
import type { PlayerCharacterResponse } from '../../types/api';
import type { CampaignCard, CampaignWithForm } from '../../composables/publicWorlds/usePublicWorldsSlice';
import { campaignStatusClass, campaignStatusLabel } from '../../utils/campaignStatus';

defineProps<{
  card: CampaignCard;
  characters: PlayerCharacterResponse[];
  isViewerOnly: boolean;
  statusLabel: (campaignId: number) => string;
  canRequest: (campaignId: number) => boolean;
}>();

const emit = defineEmits<{
  (e: 'submit-join-request', campaign: CampaignWithForm): void;
}>();
</script>

<template>
  <article class="card muted public-world-card">
    <header class="card-header world-card-title-row">
      <div class="world-card-title-block">
        <h2 class="card-title world-card-title">{{ card.world.name }}</h2>
        <p class="card-subtitle">
          {{ card.world.description || 'Nessuna descrizione.' }}
        </p>
      </div>
      <span class="world-visibility-badge">{{ card.world.isPublic ? 'Pubblico' : 'Privato' }}</span>
    </header>

    <div class="world-card-meta">
      <span>Creatore: {{ card.world.ownerNickname ?? 'N/D' }}</span>
      <span>Campagne: {{ card.campaigns.length }}</span>
    </div>

    <section class="world-campaigns-section">
      <div class="world-campaigns-section__header">
        <h3>Campagne disponibili</h3>
      </div>
      <p v-if="!card.campaigns.length" class="world-card-empty">Nessuna campagna per questo mondo.</p>
      <ul v-else class="world-campaign-list">
        <li v-for="campaign in card.campaigns" :key="campaign.id" class="world-campaign-card">
          <div class="campaign-title-row">
            <h4 class="card-title campaign-title">{{ campaign.name }}</h4>
            <span :class="['campaign-status-badge', campaignStatusClass(campaign.status)]">
              {{ campaignStatusLabel(campaign.status) }}
            </span>
          </div>
          <p class="card-subtitle">{{ campaign.description || 'Nessuna descrizione.' }}</p>
          <div class="campaign-meta">
            <span>DM: {{ campaign.ownerNickname ?? 'N/D' }}</span>
          </div>

          <p class="status-message">{{ statusLabel(campaign.id) }}</p>

          <form
            v-if="!isViewerOnly && characters.length && canRequest(campaign.id)"
            class="world-join-form"
            @submit.prevent="emit('submit-join-request', campaign)"
          >
            <label class="field">
              <span>Scegli personaggio</span>
              <select v-model.number="campaign.form.characterId">
                <option :value="null">-- seleziona --</option>
                <option
                  v-for="character in characters"
                  :key="character.id"
                  :value="character.id"
                  :label="`${character.name} (Lv. ${character.level ?? 'N/D'} - ${character.characterClass ?? 'Classe'})`"
                >
                  {{ character.name }} (Lv. {{ character.level ?? 'N/D' }} Жњ
                  {{ character.characterClass ?? 'Classe' }})
                </option>
              </select>
            </label>
            <label class="field">
              <span>Messaggio opzionale</span>
              <textarea v-model="campaign.form.message" rows="2" />
            </label>
            <button class="btn btn-primary world-join-form__submit" type="submit" :disabled="campaign.form.submitting">
              {{ campaign.form.submitting ? 'Invio...' : 'Richiedi accesso' }}
            </button>
            <p v-if="campaign.form.error" class="status-message text-danger">
              {{ campaign.form.error }}
            </p>
            <p v-if="campaign.form.success" class="status-message text-success">
              {{ campaign.form.success }}
            </p>
          </form>

          <p v-else-if="isViewerOnly" class="status-message">
            Gli account Viewer possono solo consultare le campagne aperte.
          </p>
          <p v-else-if="!characters.length" class="status-message text-danger">
            Crea prima un personaggio per inviare richieste.
          </p>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.public-world-card {
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 2vw, 1.35rem);
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 76%, transparent);
  border-radius: 1.15rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 80%, var(--app-surface));
  box-shadow: 0 14px 32px color-mix(in srgb, var(--app-shadow) 28%, transparent);
}

.world-card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.world-card-title-block {
  min-width: 0;
  flex: 1 1 auto;
}

.world-card-title {
  margin: 0;
  min-width: 0;
  color: var(--app-text);
  font-size: clamp(1.35rem, 3vw, 1.85rem);
  line-height: 1.08;
  overflow-wrap: break-word;
  word-break: normal;
}

.world-card-title-block .card-subtitle {
  margin-top: 0.45rem;
  line-height: 1.5;
  overflow-wrap: break-word;
}

.world-visibility-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  align-self: flex-start;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-surface-outline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-accent) 10%, transparent);
  color: var(--app-text);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.28rem 0.6rem;
  white-space: nowrap;
}

.world-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.world-card-meta span,
.campaign-meta span {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 62%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-surface-elevated) 72%, transparent);
  color: var(--app-text-muted);
  font-size: 0.76rem;
  font-weight: 750;
  padding: 0.24rem 0.55rem;
}

.world-campaigns-section {
  display: grid;
  gap: 0.75rem;
  padding-top: 0.9rem;
  border-top: 1px solid color-mix(in srgb, var(--app-surface-outline) 52%, transparent);
}

.world-campaigns-section__header h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 1rem;
}

.world-card-empty {
  margin: 0;
  color: var(--app-text-muted);
}

.world-campaign-list {
  display: grid;
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.world-campaign-card {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 66%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 72%, transparent);
}

.campaign-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.campaign-title {
  margin: 0;
  min-width: 0;
  color: var(--app-text);
  line-height: 1.15;
  overflow-wrap: break-word;
  word-break: normal;
}

.campaign-title-row .campaign-status-badge {
  flex-shrink: 0;
}

.world-join-form {
  display: grid;
  gap: 0.75rem;
}

.world-join-form__submit {
  justify-self: flex-start;
  min-width: 11rem;
}

@media (max-width: 640px) {
  .public-world-card {
    padding: 0.95rem;
    border-radius: 1rem;
  }

  .world-card-title-row,
  .campaign-title-row {
    align-items: flex-start;
  }

  .world-card-title-row {
    flex-direction: column;
  }

  .campaign-title-row {
    gap: 0.5rem;
  }

  .world-join-form__submit {
    width: 100%;
  }
}
</style>
