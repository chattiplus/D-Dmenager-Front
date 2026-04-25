<script setup lang="ts">
import type { PlayerCharacterResponse } from '../../types/api';
import type { CampaignCard, CampaignWithForm } from '../../composables/publicWorlds/usePublicWorldsSlice';

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
    <header class="card-header">
      <div>
        <h2 class="card-title">{{ card.world.name }}</h2>
        <p class="card-subtitle">
          {{ card.world.description || 'Nessuna descrizione.' }}
        </p>
      </div>
      <span class="tag">{{ card.world.isPublic ? 'Pubblico' : 'Privato' }}</span>
    </header>

    <section class="stack">
      <h3>Campagne disponibili</h3>
      <p v-if="!card.campaigns.length" class="muted">Nessuna campagna per questo mondo.</p>
      <ul v-else class="list-stack">
        <li v-for="campaign in card.campaigns" :key="campaign.id" class="card stack">
          <h4 class="card-title">{{ campaign.name }}</h4>
          <p class="card-subtitle">{{ campaign.description || 'Nessuna descrizione.' }}</p>
          <p class="world-meta">Status: {{ campaign.status }}</p>
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
