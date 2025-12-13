<!-- src/views/CampaignDetailView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { getCampaignById } from '../api/campaignsApi';
import { createSession, getSessionsByCampaign } from '../api/sessionsApi';
import type {
  CampaignPlayerResponse,
  CampaignResponse,
  CreateSessionRequest,
  SessionResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { getMyJoinRequestForCampaign } from '../api/campaignPlayersApi';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { canManageContent } = storeToRefs(authStore);
const canMutate = canManageContent;

const campaignId = computed(() => {
  const value = Number(route.params.id);
  return Number.isNaN(value) ? null : value;
});

const campaign = ref<CampaignResponse | null>(null);
const sessions = ref<SessionResponse[]>([]);
const myJoinRequest = ref<CampaignPlayerResponse | null>(null);

const campaignError = ref('');
const sessionsError = ref('');
const loadingCampaign = ref(false);
const loadingSessions = ref(false);
const loadingJoinRequest = ref(false);
const joinRequestError = ref('');

const sessionForm = reactive<CreateSessionRequest>({
  title: '',
  sessionNumber: 1,
  sessionDate: '',
  notes: '',
});

const creatingSession = ref(false);
const sessionFormError = ref('');

const loadCampaign = async () => {
  if (!campaignId.value) {
    campaignError.value = 'ID campagna non valido.';
    return;
  }
  loadingCampaign.value = true;
  campaignError.value = '';
  try {
    campaign.value = await getCampaignById(campaignId.value);
  } catch (error) {
    campaignError.value = extractApiErrorMessage(
      error,
      'Errore nel caricamento della campagna.',
    );
  } finally {
    loadingCampaign.value = false;
  }
};

const loadSessions = async () => {
  if (!campaignId.value || !canMutate.value) return;
  loadingSessions.value = true;
  sessionsError.value = '';
  try {
    sessions.value = await getSessionsByCampaign(campaignId.value);
  } catch (error) {
    sessionsError.value = extractApiErrorMessage(error, 'Errore nel recupero delle sessioni.');
  } finally {
    loadingSessions.value = false;
  }
};

const loadMyJoinRequest = async () => {
  if (!campaignId.value || canMutate.value || authStore.isViewerOnly) {
    myJoinRequest.value = null;
    return;
  }
  loadingJoinRequest.value = true;
  joinRequestError.value = '';
  try {
    myJoinRequest.value = await getMyJoinRequestForCampaign(campaignId.value);
  } catch (error) {
    const message = extractApiErrorMessage(error);
    if (message.includes('not found')) {
      myJoinRequest.value = null;
    } else {
      joinRequestError.value = extractApiErrorMessage(error, 'Impossibile caricare la richiesta.');
    }
  } finally {
    loadingJoinRequest.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([loadCampaign(), loadSessions(), loadMyJoinRequest()]);
};

const handleCreateSession = async () => {
  if (!campaignId.value) return;
  sessionFormError.value = '';
  creatingSession.value = true;
  try {
    await createSession(campaignId.value, {
      title: sessionForm.title.trim(),
      sessionNumber: sessionForm.sessionNumber,
      sessionDate: sessionForm.sessionDate || undefined,
      notes: sessionForm.notes?.trim() || undefined,
    });
    sessionForm.title = '';
    sessionForm.sessionNumber = Math.max(1, sessionForm.sessionNumber + 1);
    sessionForm.sessionDate = '';
    sessionForm.notes = '';
    await loadSessions();
  } catch (error) {
    sessionFormError.value = extractApiErrorMessage(error, 'Errore nella creazione della sessione.');
  } finally {
    creatingSession.value = false;
  }
};

const goToSession = (sessionId: number) => {
  router.push({
    name: 'dm-session-detail',
    params: { id: sessionId },
  });
};

watch(
  [() => authStore.isAuthenticated, campaignId],
  ([loggedIn, id]) => {
    if (loggedIn && id) {
      refreshAll();
    } else {
      campaign.value = null;
      sessions.value = [];
      myJoinRequest.value = null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Dettaglio Campagna</h1>
        <p class="section-subtitle">Campaign ID: {{ campaign?.id ?? route.params.id }}</p>
      </header>

      <div v-if="campaignError" class="status-message text-danger">{{ campaignError }}</div>
      <div v-else-if="loadingCampaign">Caricamento campagna...</div>
      <div v-else-if="campaign" class="stack">
        <article class="card muted stack">
          <h2 class="card-title">{{ campaign.name }}</h2>
          <p>{{ campaign.description || 'Nessuna descrizione.' }}</p>
          <p class="world-meta">Status: {{ campaign.status }}</p>
          <p class="world-meta">
            Owner: {{ campaign.ownerNickname ?? 'N/D' }} (#{{ campaign.ownerId ?? '—' }})
          </p>
          <p class="world-meta">World ID: {{ campaign.worldId }}</p>
        </article>

        <section v-if="!canMutate" class="stack">
          <h3>Stato richiesta di accesso</h3>
          <p v-if="loadingJoinRequest">Verifica stato...</p>
          <p v-else-if="joinRequestError" class="status-message text-danger">{{ joinRequestError }}</p>
          <template v-else>
            <p v-if="myJoinRequest" class="status-message">
              Stato: {{ myJoinRequest.status }}
              <span v-if="myJoinRequest.message">- "{{ myJoinRequest.message }}"</span>
            </p>
            <p v-else class="muted">
              Nessuna richiesta inviata. Torna alla sezione "Mondi pubblici" per inoltrarla.
            </p>
          </template>
        </section>

        <section class="stack">
          <header class="section-header">
            <h3>Sessioni</h3>
            <button class="btn btn-link" @click="loadSessions" :disabled="loadingSessions">
              Aggiorna sessioni
            </button>
          </header>

          <p v-if="sessionsError" class="status-message text-danger">{{ sessionsError }}</p>
          <ul v-else-if="sessions.length" class="list-grid">
            <li v-for="session in sessions" :key="session.id" class="card">
              <h4 class="card-title">
                {{ session.sessionNumber }} · {{ session.title }}
              </h4>
              <p class="card-subtitle">
                Data: {{ session.sessionDate ?? 'Non pianificata' }}
              </p>
              <p>{{ session.notes || 'Nessuna nota.' }}</p>
              <button class="btn btn-link" @click="goToSession(session.id)">
                Apri sessione
              </button>
            </li>
          </ul>
          <p v-else class="muted">Nessuna sessione associata.</p>

          <form
            v-if="canMutate"
            class="card muted stack"
            @submit.prevent="handleCreateSession"
          >
            <h4 class="card-title">Nuova sessione</h4>
            <label class="field">
              <span>Titolo</span>
              <input v-model="sessionForm.title" type="text" required />
            </label>
            <label class="field">
              <span>Numero sessione</span>
              <input v-model.number="sessionForm.sessionNumber" type="number" min="1" required />
            </label>
            <label class="field">
              <span>Data (YYYY-MM-DD)</span>
              <input v-model="sessionForm.sessionDate" type="date" />
            </label>
            <label class="field">
              <span>Note</span>
              <textarea v-model="sessionForm.notes" rows="3" />
            </label>
            <button class="btn btn-secondary" type="submit" :disabled="creatingSession">
              {{ creatingSession ? 'Creazione...' : 'Crea sessione' }}
            </button>
            <p v-if="sessionFormError" class="status-message text-danger">{{ sessionFormError }}</p>
          </form>
        </section>
      </div>
    </div>
  </section>
</template>
