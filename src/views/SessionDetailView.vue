<!-- src/views/SessionDetailView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import {
  createSessionEvent,
  deleteSessionEvent,
  getSessionEvents,
  updateSessionEvent,
} from '../api/sessionEventsApi';
import { getCampaignById } from '../api/campaignsApi';
import { getSessionsByCampaign } from '../api/sessionsApi';
import type {
  CreateSessionEventRequest,
  SessionEventResponse,
  SessionResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

const route = useRoute();
const authStore = useAuthStore();
const { canManageContent } = storeToRefs(authStore);
const canMutate = canManageContent;

const sessionId = computed(() => {
  const value = Number(route.params.id);
  return Number.isNaN(value) ? null : value;
});

const campaignId = computed(() => {
  const campaignParam = route.query.campaignId;
  if (typeof campaignParam === 'string') {
    const parsed = Number(campaignParam);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
});

const events = ref<SessionEventResponse[]>([]);
const eventsError = ref('');
const loadingEvents = ref(false);

const sessionInfo = ref<SessionResponse | null>(null);
const sessionInfoError = ref('');
const campaignName = ref('');

const eventForm = reactive<CreateSessionEventRequest>({
  sessionId: 0,
  title: '',
  type: '',
  description: '',
  inGameTime: '',
  isVisibleToPlayers: true,
});

const eventFormError = ref('');
const submittingEvent = ref(false);
const editingEventId = ref<number | null>(null);

const resetForm = () => {
  eventForm.title = '';
  eventForm.type = '';
  eventForm.description = '';
  eventForm.inGameTime = '';
  eventForm.isVisibleToPlayers = true;
};

const loadEvents = async () => {
  if (!sessionId.value) {
    eventsError.value = 'ID sessione non valido.';
    return;
  }
  loadingEvents.value = true;
  eventsError.value = '';
  try {
    events.value = await getSessionEvents(sessionId.value);
  } catch (error) {
    eventsError.value = extractApiErrorMessage(error, 'Errore nel recupero della timeline.');
  } finally {
    loadingEvents.value = false;
  }
};

const loadSessionContext = async () => {
  sessionInfoError.value = '';
  if (!campaignId.value || !sessionId.value) {
    campaignName.value = '';
    sessionInfo.value = null;
    return;
  }

  try {
    const [campaign, sessions] = await Promise.all([
      getCampaignById(campaignId.value),
      getSessionsByCampaign(campaignId.value),
    ]);
    campaignName.value = campaign.name;
    sessionInfo.value =
      sessions.find((session) => session.id === sessionId.value) ?? null;
    if (!sessionInfo.value) {
      sessionInfoError.value =
        'La sessione non appartiene alla campagna indicata o non esiste.';
    }
  } catch (error) {
    sessionInfoError.value = extractApiErrorMessage(
      error,
      'Errore nel recupero dei dati della sessione.',
    );
  }
};

const submitEvent = async () => {
  if (!sessionId.value || !canMutate.value) return;
  eventFormError.value = '';
  submittingEvent.value = true;
  try {
    const payload: CreateSessionEventRequest = {
      sessionId: sessionId.value,
      title: eventForm.title.trim(),
      type: eventForm.type?.trim() || undefined,
      description: eventForm.description?.trim() || undefined,
      inGameTime: eventForm.inGameTime?.trim() || undefined,
      isVisibleToPlayers: eventForm.isVisibleToPlayers,
    };

    if (editingEventId.value) {
      await updateSessionEvent(editingEventId.value, payload);
    } else {
      await createSessionEvent(payload);
    }

    cancelEditing();
    await loadEvents();
  } catch (error) {
    eventFormError.value = extractApiErrorMessage(
      error,
      'Salvataggio evento non riuscito.',
    );
  } finally {
    submittingEvent.value = false;
  }
};

const startEditing = (event: SessionEventResponse) => {
  editingEventId.value = event.id;
  eventForm.title = event.title;
  eventForm.type = event.type ?? '';
  eventForm.description = event.description ?? '';
  eventForm.inGameTime = event.inGameTime ?? '';
  eventForm.isVisibleToPlayers = event.isVisibleToPlayers;
};

const cancelEditing = () => {
  editingEventId.value = null;
  resetForm();
};

const removeEvent = async (eventId: number) => {
  if (!canMutate.value) return;
  try {
    await deleteSessionEvent(eventId);
    await loadEvents();
  } catch (error) {
    eventsError.value = extractApiErrorMessage(error, 'Eliminazione evento non riuscita.');
  }
};

watch(
  [() => authStore.isAuthenticated, sessionId],
  ([loggedIn, id]) => {
    if (loggedIn && id) {
      eventForm.sessionId = id;
      loadEvents();
    } else {
      events.value = [];
    }
  },
  { immediate: true },
);

watch(
  [() => authStore.isAuthenticated, sessionId, campaignId],
  ([loggedIn, sId, cId]) => {
    if (loggedIn && sId && cId) {
      loadSessionContext();
    } else if (!cId) {
      campaignName.value = '';
      sessionInfo.value = null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Timeline Sessione</h1>
        <p class="section-subtitle">
          Session ID: {{ sessionId ?? route.params.id }}
          <span v-if="campaignName">· Campagna: {{ campaignName }}</span>
        </p>
      </header>

      <div v-if="sessionInfoError" class="status-message text-danger">
        {{ sessionInfoError }}
      </div>

      <article v-if="sessionInfo" class="card muted stack">
        <h2 class="card-title">{{ sessionInfo.sessionNumber }} · {{ sessionInfo.title }}</h2>
        <p class="card-subtitle">
          Data: {{ sessionInfo.sessionDate ?? 'Non pianificata' }}
        </p>
        <p>{{ sessionInfo.notes || 'Nessuna nota per questa sessione.' }}</p>
      </article>

      <section class="stack">
        <header class="section-header">
          <h3>Eventi</h3>
          <button class="btn btn-link" @click="loadEvents" :disabled="loadingEvents">
            Aggiorna eventi
          </button>
        </header>

        <p v-if="eventsError" class="status-message text-danger">{{ eventsError }}</p>
        <ul v-else-if="events.length" class="timeline">
          <li v-for="event in events" :key="event.id" class="timeline-item card">
            <header class="card-header">
              <div>
                <h4 class="card-title">{{ event.title }}</h4>
                <p class="card-subtitle">
                  {{ event.type || 'Evento' }} · {{ event.inGameTime || 'Tempo non indicato' }}
                </p>
              </div>
              <small class="tag tag-muted">{{ new Date(event.createdAt).toLocaleString() }}</small>
            </header>
            <p>{{ event.description || 'Nessuna descrizione.' }}</p>
            <p class="world-meta">
              Visibile ai player: {{ event.isVisibleToPlayers ? 'Sì' : 'No' }}
            </p>
            <p class="world-meta">
              Owner: {{ event.ownerNickname ?? 'N/D' }} (#{{ event.ownerId ?? '—' }})
            </p>
            <div v-if="canMutate" class="actions">
              <button class="btn btn-link" @click="startEditing(event)">Modifica</button>
              <button class="btn btn-link text-danger" @click="removeEvent(event.id)">
                Elimina
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="muted">Nessun evento registrato per questa sessione.</p>
      </section>

      <section v-if="canMutate" class="card muted stack">
        <h3 class="card-title">
          {{ editingEventId ? 'Modifica evento' : 'Nuovo evento' }}
        </h3>
        <form class="stack" @submit.prevent="submitEvent">
          <label class="field">
            <span>Titolo</span>
            <input v-model="eventForm.title" type="text" required />
          </label>
          <label class="field">
            <span>Tipo</span>
            <input v-model="eventForm.type" type="text" />
          </label>
          <label class="field">
            <span>Descrizione</span>
            <textarea v-model="eventForm.description" rows="3" />
          </label>
          <label class="field">
            <span>Orario in-game</span>
            <input v-model="eventForm.inGameTime" type="text" />
          </label>
          <label class="field checkbox">
            <input v-model="eventForm.isVisibleToPlayers" type="checkbox" />
            <span>Visibile a player/viewer</span>
          </label>
          <div class="actions">
            <button class="btn btn-secondary" type="submit" :disabled="submittingEvent">
              {{ submittingEvent ? 'Salvataggio...' : editingEventId ? 'Aggiorna evento' : 'Crea evento' }}
            </button>
            <button
              v-if="editingEventId"
              class="btn btn-link"
              type="button"
              @click="cancelEditing"
            >
              Annulla modifica
            </button>
          </div>
          <p v-if="eventFormError" class="status-message text-danger">{{ eventFormError }}</p>
        </form>
      </section>
    </div>
  </section>
</template>
