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
  <article class="card muted stack">
    <header class="card-header world-card-title-row">
      <div class="world-card-title-block">
        <span class="world-card-kicker">Mondo</span>
        <h2 class="card-title world-card-title">{{ card.world.name }}</h2>
        <p class="card-subtitle">
          {{ card.world.description || 'Nessuna descrizione.' }}
        </p>
      </div>
      <span class="tag world-visibility-badge">{{ card.world.isPublic ? 'Pubblico' : 'Privato' }}</span>
    </header>

    <section class="stack">
      <h3>Campagne disponibili</h3>
      <p v-if="!card.campaigns.length" class="muted">Nessuna campagna per questo mondo.</p>
      <ul v-else class="list-stack">
        <li v-for="campaign in card.campaigns" :key="campaign.id" class="card stack">
          <div class="campaign-title-row">
            <h4 class="card-title campaign-title">{{ campaign.name }}</h4>
            <span :class="['campaign-status-badge', campaignStatusClass(campaign.status)]">
              {{ campaignStatusLabel(campaign.status) }}
            </span>
          </div>
          <p class="card-subtitle">{{ campaign.description || 'Nessuna descrizione.' }}</p>
          <p class="world-meta">Owner: {{ campaign.ownerNickname ?? 'N/D' }}</p>

          <p class="status-message">{{ statusLabel(campaign.id) }}</p>

          <form
            v-if="!isViewerOnly && characters.length && canRequest(campaign.id)"
            class="stack"
            @submit.prevent="emit('submit-join-request', campaign)"
          >
            <label class="field">
              <span>Scegli personaggio</span>
              <select v-model.number="campaign.form.characterId">
                <option :value="null">-- seleziona --</option>
                <option v-for="character in characters" :key="character.id" :value="character.id">
                  {{ character.name }} (Lv. {{ character.level ?? 'N/D' }} Жњ
                  {{ character.characterClass ?? 'Classe' }})
                </option>
              </select>
            </label>
            <label class="field">
              <span>Messaggio opzionale</span>
              <textarea v-model="campaign.form.message" rows="2" />
            </label>
            <button class="btn btn-secondary" type="submit" :disabled="campaign.form.submitting">
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
.world-card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.world-card-title-block {
  min-width: 0;
  flex: 1 1 auto;
}

.world-card-kicker {
  display: inline-block;
  margin-bottom: 0.25rem;
  color: var(--app-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.world-card-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.world-visibility-badge {
  flex-shrink: 0;
  align-self: flex-start;
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
  overflow-wrap: anywhere;
}

.campaign-title-row .campaign-status-badge {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .world-card-title-row,
  .campaign-title-row {
    align-items: flex-start;
  }
}
</style>
