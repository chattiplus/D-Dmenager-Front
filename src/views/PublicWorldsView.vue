<!-- src/views/PublicWorldsView.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getPublicWorlds } from '../api/worldsApi';
import { getCampaignsByWorld } from '../api/campaignsApi';
import { getMyCharacters } from '../api/charactersApi';
import { getMyJoinRequests, requestCampaignJoin } from '../api/campaignPlayersApi';
import type {
  CampaignPlayerResponse,
  CampaignResponse,
  PlayerCharacterResponse,
  WorldResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { useAuthStore } from '../store/authStore';

type CampaignWithForm = CampaignResponse & { form: JoinFormState };
type CampaignCard = {
  world: WorldResponse;
  campaigns: CampaignWithForm[];
};

type JoinFormState = {
  characterId: number | null;
  message: string;
  submitting: boolean;
  error: string;
  success: string;
};

const authStore = useAuthStore();
const worlds = ref<CampaignCard[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const characters = ref<PlayerCharacterResponse[]>([]);
const joinRequests = ref<Record<number, CampaignPlayerResponse>>({});
const joinRequestWarning = ref('');

const loadWorlds = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const worldList = await getPublicWorlds();
    const cards = await Promise.all(
      worldList.map(async (world) => {
        const campaigns = await getCampaignsByWorld(world.id);
        const campaignsWithForms: CampaignWithForm[] = campaigns.map((campaign) => ({
          ...campaign,
          form: {
            characterId: null,
            message: '',
            submitting: false,
            error: '',
            success: '',
          },
        }));
        return { world, campaigns: campaignsWithForms };
      }),
    );
    worlds.value = cards;
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi pubblici.');
  } finally {
    loading.value = false;
  }
};

const loadCharacters = async () => {
  if (authStore.isViewerOnly) {
    characters.value = [];
    return;
  }
  try {
    characters.value = await getMyCharacters();
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Impossibile recuperare i personaggi.');
  }
};

const loadJoinRequests = async () => {
  if (authStore.isViewerOnly) {
    joinRequests.value = {};
    joinRequestWarning.value = '';
    return;
  }
  joinRequestWarning.value = '';
  try {
    const requests = await getMyJoinRequests();
    const map: Record<number, CampaignPlayerResponse> = {};
    requests.forEach((req) => {
      if (req.campaignId != null) {
        map[req.campaignId] = req;
      }
    });
    joinRequests.value = map;
  } catch (error) {
    joinRequestWarning.value = extractApiErrorMessage(
      error,
      'Impossibile recuperare lo stato delle tue richieste.',
    );
  }
};

const statusLabel = (campaignId: number) => {
  const request = joinRequests.value[campaignId];
  if (!request) return 'Nessuna richiesta inviata.';
  if (request.status === 'PENDING') return 'Richiesta in attesa di approvazione.';
  if (request.status === 'APPROVED') return 'Hai accesso a questa campagna.';
  return 'Richiesta rifiutata. Puoi inviarne un\'altra.';
};

const canRequest = (campaignId: number) => {
  const request = joinRequests.value[campaignId];
  return !request || request.status === 'REJECTED';
};

const submitJoinRequest = async (campaign: CampaignWithForm) => {
  if (authStore.isViewerOnly) {
    campaign.form.error = 'Gli account Viewer non possono inviare richieste.';
    return;
  }
  const form = campaign.form;
  if (!form.characterId) {
    form.error = 'Seleziona un personaggio.';
    return;
  }
  form.error = '';
  form.success = '';
  form.submitting = true;
  try {
    const response = await requestCampaignJoin(campaign.id, {
      characterId: form.characterId,
      message: form.message || undefined,
    });
    joinRequests.value[campaign.id] = response;
    form.success = 'Richiesta inviata.';
  } catch (error) {
    form.error = extractApiErrorMessage(error, 'Impossibile inviare la richiesta.');
  } finally {
    form.submitting = false;
  }
};

onMounted(async () => {
  await loadWorlds();
  if (authStore.isViewerOnly) {
    characters.value = [];
    joinRequests.value = {};
    joinRequestWarning.value = '';
  } else {
    await Promise.all([loadCharacters(), loadJoinRequests()]);
  }
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Mondi pubblici</h1>
        <p class="section-subtitle">
          Sfoglia le campagne aperte e invia la tua richiesta di partecipazione usando i personaggi creati.
        </p>
      </header>

      <div v-if="loading">Caricamento mondi pubblici...</div>
      <p v-else-if="errorMessage" class="status-message text-danger">{{ errorMessage }}</p>

      <div v-else class="stack">
        <p v-if="joinRequestWarning" class="status-message text-danger">
          {{ joinRequestWarning }}
        </p>
        <article v-for="card in worlds" :key="card.world.id" class="card muted stack">
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
                  v-if="!authStore.isViewerOnly && characters.length && canRequest(campaign.id)"
                  class="stack"
                  @submit.prevent="submitJoinRequest(campaign)"
                >
                  <label class="field">
                    <span>Scegli personaggio</span>
                    <select v-model.number="campaign.form.characterId">
                      <option :value="null">-- seleziona --</option>
                      <option v-for="character in characters" :key="character.id" :value="character.id">
                        {{ character.name }} (Lv. {{ character.level ?? 'N/D' }} ·
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

                <p v-else-if="authStore.isViewerOnly" class="status-message">
                  Gli account Viewer possono solo consultare le campagne aperte.
                </p>
                <p v-else-if="!characters.length" class="status-message text-danger">
                  Crea prima un personaggio per inviare richieste.
                </p>
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  </section>
</template>
