<!-- src/views/DmSessionDetailView.vue -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../store/authStore';
import {
  getSessionById,
  updateSession,
  deleteSession,
} from '../api/sessionsApi';
import { getCampaignById } from '../api/campaignsApi';
import {
  createSessionEvent,
  deleteSessionEvent,
  getSessionEvents,
  updateSessionEvent,
} from '../api/sessionEventsApi';
import { getCampaignPlayers } from '../api/campaignPlayersApi';
import { getSessionChatMessages, sendSessionChatMessage } from '../api/sessionChatApi';
import type {
  CampaignPlayerResponse,
  CreateSessionEventRequest,
  CreateSessionRequest,
  SessionChatMessageResponse,
  SessionEventResponse,
  SessionResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { canManageContent } = storeToRefs(authStore);

const sessionId = computed(() => {
  const parsed = Number(route.params.id);
  return Number.isNaN(parsed) ? null : parsed;
});

const session = ref<SessionResponse | null>(null);
const sessionError = ref('');
const sessionLoading = ref(false);
const campaignName = ref('');
const campaignError = ref('');

const isEditingSession = ref(false);
const sessionForm = reactive<CreateSessionRequest>({
  title: '',
  sessionNumber: 1,
  sessionDate: '',
  notes: '',
});
const sessionFormError = ref('');
const saveSessionLoading = ref(false);
const deleteSessionLoading = ref(false);

const events = ref<SessionEventResponse[]>([]);
const eventsError = ref('');
const loadingEvents = ref(false);
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

const campaignPlayers = ref<CampaignPlayerResponse[]>([]);
const campaignPlayersError = ref('');

const chatMessages = ref<SessionChatMessageResponse[]>([]);
const lastMessageId = ref<number | null>(null);
const chatError = ref('');
const chatLoading = ref(false);
const chatSending = ref(false);
const chatForm = reactive({
  content: '',
  language: 'COMMON',
  senderCharacterId: null as number | null,
  messageType: 'IC',
});
const chatContainerRef = ref<HTMLElement | null>(null);
let chatInterval: ReturnType<typeof setInterval> | null = null;

const CHAT_POLL_INTERVAL = 2000;

const DEFAULT_LANGUAGES = [
  'COMMON',
  'DWARVISH',
  'ELVISH',
  'GIANT',
  'GNOMISH',
  'GOBLIN',
  'HALFLING',
  'ORC',
  'ABYSSAL',
  'CELESTIAL',
  'DRACONIC',
  'DEEP_SPEECH',
  'INFERNAL',
  'PRIMORDIAL',
  'SYLVAN',
  'UNDERCOMMON',
];

const activeTab = ref<'events' | 'chat'>('events');
const chatCharacterOptions = computed(() => {
  const approved = campaignPlayers.value.filter(
    (player) => player.status === 'APPROVED' && player.characterId,
  );
  return approved.map((player) => ({
    id: player.characterId as number,
    label: `${player.characterName ?? 'Personaggio'} (${player.playerNickname ?? 'Player'})`,
  }));
});
const chatLanguageOptions = computed(() => DEFAULT_LANGUAGES);
const chatCanSend = computed(() => canManageContent.value);
const currentUserId = computed(() => authStore.profile?.id ?? null);

const populateSessionForm = (data: SessionResponse) => {
  sessionForm.title = data.title;
  sessionForm.sessionNumber = data.sessionNumber;
  sessionForm.sessionDate = data.sessionDate ?? '';
  sessionForm.notes = data.notes ?? '';
};

const loadCampaignName = async (campaignId: number) => {
  campaignError.value = '';
  try {
    const campaign = await getCampaignById(campaignId);
    campaignName.value = campaign.name;
  } catch (error) {
    campaignError.value = extractApiErrorMessage(error, 'Impossibile recuperare la campagna.');
    campaignName.value = '';
  }
};

const loadCampaignPlayers = async (campaignId: number) => {
  campaignPlayersError.value = '';
  try {
    campaignPlayers.value = await getCampaignPlayers(campaignId);
  } catch (error) {
    campaignPlayersError.value = extractApiErrorMessage(
      error,
      'Impossibile caricare i personaggi della campagna.',
    );
    campaignPlayers.value = [];
  }
};

const loadSession = async () => {
  if (!sessionId.value) {
    sessionError.value = 'ID sessione non valido.';
    return;
  }
  sessionLoading.value = true;
  sessionError.value = '';
  try {
    const data = await getSessionById(sessionId.value);
    session.value = data;
    populateSessionForm(data);
    await Promise.all([loadCampaignName(data.campaignId), loadCampaignPlayers(data.campaignId)]);
  } catch (error) {
    session.value = null;
    sessionError.value = extractApiErrorMessage(error, 'Impossibile caricare la sessione.');
  } finally {
    sessionLoading.value = false;
  }
};

const startSessionEdit = () => {
  if (!session.value) {
    return;
  }
  populateSessionForm(session.value);
  sessionFormError.value = '';
  isEditingSession.value = true;
};

const cancelSessionEdit = () => {
  isEditingSession.value = false;
  sessionFormError.value = '';
  if (session.value) {
    populateSessionForm(session.value);
  }
};

const saveSessionChanges = async () => {
  if (!sessionId.value) {
    return;
  }
  sessionFormError.value = '';
  saveSessionLoading.value = true;
  try {
    const payload: CreateSessionRequest = {
      title: sessionForm.title.trim(),
      sessionNumber: sessionForm.sessionNumber,
      sessionDate: sessionForm.sessionDate || undefined,
      notes: sessionForm.notes?.trim() || undefined,
    };
    const updated = await updateSession(sessionId.value, payload);
    session.value = updated;
    populateSessionForm(updated);
    isEditingSession.value = false;
  } catch (error) {
    sessionFormError.value = extractApiErrorMessage(error, 'Aggiornamento sessione non riuscito.');
  } finally {
    saveSessionLoading.value = false;
  }
};

const handleDeleteSession = async () => {
  if (!sessionId.value || !session.value) {
    return;
  }
  const confirmed = window.confirm(
    'Sei sicuro di voler eliminare questa sessione? L’operazione è irreversibile.',
  );
  if (!confirmed) {
    return;
  }
  deleteSessionLoading.value = true;
  try {
    await deleteSession(sessionId.value);
    router.push({ name: 'campaign-detail', params: { id: session.value.campaignId } });
  } catch (error) {
    sessionError.value = extractApiErrorMessage(error, 'Eliminazione sessione non riuscita.');
  } finally {
    deleteSessionLoading.value = false;
  }
};

const resetEventForm = () => {
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

const submitEvent = async () => {
  if (!sessionId.value || !canManageContent.value) {
    return;
  }
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
    cancelEventEdit();
    await loadEvents();
  } catch (error) {
    eventFormError.value = extractApiErrorMessage(error, 'Salvataggio evento non riuscito.');
  } finally {
    submittingEvent.value = false;
  }
};

const startEventEdit = (event: SessionEventResponse) => {
  if (!canManageContent.value) {
    return;
  }
  editingEventId.value = event.id;
  eventForm.title = event.title;
  eventForm.type = event.type ?? '';
  eventForm.description = event.description ?? '';
  eventForm.inGameTime = event.inGameTime ?? '';
  eventForm.isVisibleToPlayers = event.isVisibleToPlayers;
};

const cancelEventEdit = () => {
  editingEventId.value = null;
  resetEventForm();
};

const removeEvent = async (eventId: number) => {
  if (!canManageContent.value) {
    return;
  }
  try {
    await deleteSessionEvent(eventId);
    await loadEvents();
  } catch (error) {
    eventsError.value = extractApiErrorMessage(error, 'Eliminazione evento non riuscita.');
  }
};

const sortChatMessages = (messages: SessionChatMessageResponse[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

const isNearBottom = (offset = 40) => {
  const el = chatContainerRef.value;
  if (!el) {
    return true;
  }
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  return distanceFromBottom <= offset;
};

const scrollToBottom = (force = false) => {
  const el = chatContainerRef.value;
  if (!el) {
    return;
  }
  if (!force && !isNearBottom()) {
    return;
  }
  el.scrollTop = el.scrollHeight;
};

interface ChatFetchOptions {
  initial?: boolean;
  showLoader?: boolean;
  forceScroll?: boolean;
}

const fetchChatMessages = async (options: ChatFetchOptions = {}) => {
  if (!sessionId.value) {
    return;
  }
  const { initial = false, showLoader = false, forceScroll = false } = options;
  const displayLoader = showLoader || (initial && chatMessages.value.length === 0);
  if (displayLoader) {
    chatLoading.value = true;
  }
  if (initial || showLoader) {
    chatError.value = '';
  }
  try {
    const data = sortChatMessages(await getSessionChatMessages(sessionId.value));
    if (initial || chatMessages.value.length === 0) {
      chatMessages.value = data;
      const lastEntry = data[data.length - 1];
      lastMessageId.value = lastEntry ? lastEntry.id : null;
      await nextTick();
      scrollToBottom(true);
      chatError.value = '';
      return;
    }

    const shouldStickToBottom = forceScroll ? true : isNearBottom();
    const lastKnownId = lastMessageId.value;
    const newMessages = lastKnownId
      ? data.filter((message) => message.id > lastKnownId)
      : data.slice(chatMessages.value.length);

    if (newMessages.length) {
      const lastNewMessage = newMessages[newMessages.length - 1];
      chatMessages.value = [...chatMessages.value, ...newMessages];
      lastMessageId.value = lastNewMessage ? lastNewMessage.id : lastMessageId.value;
      await nextTick();
      if (forceScroll || shouldStickToBottom) {
        const shouldForce = forceScroll || shouldStickToBottom;
        scrollToBottom(shouldForce);
      }
    }
    chatError.value = '';
  } catch (error) {
    chatError.value = extractApiErrorMessage(error, 'Impossibile caricare la chat.');
  } finally {
    if (displayLoader) {
      chatLoading.value = false;
    }
  }
};

const sendChatMessage = async () => {
  if (!sessionId.value || !chatCanSend.value) {
    return;
  }
  const trimmed = chatForm.content.trim();
  if (!trimmed) {
    chatError.value = 'Inserisci un messaggio.';
    return;
  }
  chatSending.value = true;
  chatError.value = '';
  try {
    const resolvedCharacterId =
      chatForm.senderCharacterId !== null && chatForm.senderCharacterId !== undefined
        ? Number(chatForm.senderCharacterId)
        : undefined;
    const payload = {
      content: trimmed,
      language: chatForm.language,
      senderCharacterId: resolvedCharacterId,
      messageType: chatForm.messageType,
    };
    const message = await sendSessionChatMessage(sessionId.value, payload);
    chatMessages.value = [...chatMessages.value, message];
    lastMessageId.value = message.id;
    await nextTick();
    scrollToBottom(true);
    chatForm.content = '';
  } catch (error) {
    chatError.value = extractApiErrorMessage(error, 'Invio messaggio non riuscito.');
  } finally {
    chatSending.value = false;
  }
};

const startChatPolling = () => {
  if (chatInterval || activeTab.value !== 'chat' || !sessionId.value) {
    return;
  }
  fetchChatMessages({ initial: chatMessages.value.length === 0, showLoader: true });
  chatInterval = window.setInterval(() => {
    fetchChatMessages();
  }, CHAT_POLL_INTERVAL);
};

const stopChatPolling = () => {
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }
};

watch(
  sessionId,
  (id) => {
    if (!id) {
      return;
    }
    eventForm.sessionId = id;
    loadSession();
    loadEvents();
    chatMessages.value = [];
    lastMessageId.value = null;
    stopChatPolling();
    if (activeTab.value === 'chat') {
      startChatPolling();
    }
  },
  { immediate: true },
);

watch(
  () => activeTab.value,
  (tab) => {
    if (tab === 'chat') {
      startChatPolling();
    } else {
      stopChatPolling();
    }
  },
  { immediate: false },
);

onMounted(() => {
  if (activeTab.value === 'chat') {
    startChatPolling();
  }
});

onBeforeUnmount(() => {
  stopChatPolling();
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header class="section-header">
        <div>
          <h1 class="section-title">Dettaglio sessione</h1>
          <p class="section-subtitle" v-if="session">
            Campaign ID: {{ session.campaignId }}
          </p>
        </div>
        <RouterLink
          v-if="session"
          class="btn btn-link"
          :to="{ name: 'campaign-detail', params: { id: session.campaignId } }"
        >
          Torna alla campagna
        </RouterLink>
      </header>

      <p v-if="sessionError" class="status-message text-danger">{{ sessionError }}</p>
      <p v-if="campaignError" class="status-message text-danger">{{ campaignError }}</p>
      <p v-if="sessionLoading">Caricamento sessione...</p>

      <section v-if="session" class="card muted stack session-overview">
        <header class="session-overview__header">
          <div>
            <p class="section-subtitle">
              Sessione #{{ session.sessionNumber }}
            </p>
            <h2 class="card-title">{{ session.title }}</h2>
            <p class="manager-meta">
              Campagna: {{ campaignName || `ID ${session.campaignId}` }}
            </p>
            <p class="manager-meta">
              Data pianificata: {{ session.sessionDate ?? 'Non pianificata' }}
            </p>
          </div>
          <div v-if="canManageContent" class="session-actions">
            <button
              v-if="!isEditingSession"
              class="btn btn-secondary"
              type="button"
              @click="startSessionEdit"
            >
              Modifica sessione
            </button>
            <button
              v-else
              class="btn btn-link"
              type="button"
              @click="cancelSessionEdit"
            >
              Annulla modifica
            </button>
            <button
              class="btn btn-link text-danger"
              type="button"
              :disabled="deleteSessionLoading"
              @click="handleDeleteSession"
            >
              {{ deleteSessionLoading ? 'Eliminazione...' : 'Elimina sessione' }}
            </button>
          </div>
        </header>

        <template v-if="isEditingSession">
          <form class="grid-form" @submit.prevent="saveSessionChanges">
            <label class="field">
              <span>Titolo</span>
              <input v-model="sessionForm.title" type="text" required />
            </label>
            <label class="field">
              <span>Numero</span>
              <input v-model.number="sessionForm.sessionNumber" type="number" min="1" required />
            </label>
            <label class="field">
              <span>Data</span>
              <input v-model="sessionForm.sessionDate" type="date" />
            </label>
            <label class="field field--full">
              <span>Note</span>
              <textarea v-model="sessionForm.notes" rows="3" />
            </label>
            <div class="session-actions">
              <button class="btn btn-primary" type="submit" :disabled="saveSessionLoading">
                {{ saveSessionLoading ? 'Salvataggio...' : 'Salva sessione' }}
              </button>
            </div>
            <p v-if="sessionFormError" class="status-message text-danger">{{ sessionFormError }}</p>
          </form>
        </template>
        <template v-else>
          <p>{{ session.notes || 'Nessuna nota per questa sessione.' }}</p>
        </template>
      </section>

      <nav class="dm-tabs" role="tablist">
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'events' }"
          @click="activeTab = 'events'"
        >
          Eventi
        </button>
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'chat' }"
          @click="activeTab = 'chat'"
        >
          Chat
        </button>
      </nav>

      <section v-if="activeTab === 'events'" class="dm-tab-panel stack">
        <header class="section-header">
          <div>
            <h3>Timeline eventi</h3>
            <p class="section-subtitle">
              Registra gli snodi chiave avvenuti durante la sessione.
            </p>
          </div>
          <button class="btn btn-link" type="button" @click="loadEvents" :disabled="loadingEvents">
            Aggiorna eventi
          </button>
        </header>

        <p v-if="eventsError" class="status-message text-danger">{{ eventsError }}</p>
        <div v-if="loadingEvents">Caricamento eventi...</div>
        <ul v-else-if="events.length" class="manager-list">
          <li v-for="event in events" :key="event.id" class="compact-card">
            <header class="section-header">
              <div>
                <p class="card-title">{{ event.title }}</p>
                <p class="manager-meta">
                  {{ event.type || 'Evento' }} - {{ event.inGameTime || 'Tempo non indicato' }}
                </p>
              </div>
              <span class="tag tag-muted">{{ new Date(event.createdAt).toLocaleString() }}</span>
            </header>
            <p>{{ event.description || 'Nessuna descrizione disponibile.' }}</p>
            <p class="manager-meta">
              Visibile ai player: {{ event.isVisibleToPlayers ? 'Sì' : 'No' }}
            </p>
            <p class="manager-meta">
              Owner: {{ event.ownerNickname ?? 'N/D' }}
            </p>
            <div v-if="canManageContent" class="actions">
              <button class="btn btn-link" type="button" @click="startEventEdit(event)">
                Modifica
              </button>
              <button
                class="btn btn-link text-danger"
                type="button"
                @click="removeEvent(event.id)"
              >
                Elimina
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="muted">Nessun evento registrato per questa sessione.</p>

        <section v-if="canManageContent" class="card muted stack">
          <h4 class="card-title">
            {{ editingEventId ? 'Modifica evento' : 'Nuovo evento' }}
          </h4>
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
              <button class="btn btn-primary" type="submit" :disabled="submittingEvent">
                {{
                  submittingEvent
                    ? 'Salvataggio...'
                    : editingEventId
                      ? 'Aggiorna evento'
                      : 'Crea evento'
                }}
              </button>
              <button
                v-if="editingEventId"
                class="btn btn-link"
                type="button"
                @click="cancelEventEdit"
              >
                Annulla
              </button>
            </div>
            <p v-if="eventFormError" class="status-message text-danger">{{ eventFormError }}</p>
          </form>
        </section>
      </section>

      <section v-else class="dm-tab-panel stack chat-panel">
        <header class="section-header">
          <div>
            <h3>Chat di sessione</h3>
            <p class="section-subtitle">
              Usa i messaggi per coordinare i giocatori durante la sessione live.
            </p>
          </div>
          <button
            class="btn btn-link"
            type="button"
            @click="fetchChatMessages({ showLoader: true })"
          >
            Aggiorna chat
          </button>
        </header>

        <p v-if="campaignPlayersError" class="status-message text-danger">
          {{ campaignPlayersError }}
        </p>
        <p v-if="chatError" class="status-message text-danger">{{ chatError }}</p>

        <div class="chat-feed" :class="{ loading: chatLoading }">
          <p v-if="chatLoading" class="muted">Caricamento messaggi...</p>
          <p v-else-if="!chatMessages.length" class="muted">
            Ancora nessun messaggio. Inizia la conversazione!
          </p>
          <ul v-else ref="chatContainerRef" class="chat-feed__list">
            <li
              v-for="message in chatMessages"
              :key="message.id"
              class="chat-message"
              :class="{ self: message.senderUserId === currentUserId }"
            >
              <div class="chat-message__header">
                <div>
                  <strong>{{ message.senderNickname }}</strong>
                  <span v-if="message.senderCharacterName" class="muted">
                    ({{ message.senderCharacterName }})
                  </span>
                </div>
                <div class="chat-message__meta">
                  <span class="pill">{{ message.language }}</span>
                  <small>{{ new Date(message.createdAt).toLocaleString() }}</small>
                </div>
              </div>
              <p class="chat-message__content">
                {{ message.contentVisible }}
              </p>
            </li>
          </ul>
        </div>

        <section v-if="chatCanSend" class="card muted stack chat-form">
          <h4 class="card-title">Invia messaggio</h4>
          <form class="stack" @submit.prevent="sendChatMessage">
            <label class="field">
              <span>Personaggio (opzionale)</span>
              <select v-model="chatForm.senderCharacterId">
                <option :value="null">Master / Narratore</option>
                <option v-for="option in chatCharacterOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>Lingua</span>
              <select v-model="chatForm.language">
                <option v-for="language in chatLanguageOptions" :key="language" :value="language">
                  {{ language }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>Messaggio</span>
              <textarea v-model="chatForm.content" rows="3" placeholder="Scrivi qui..." />
            </label>
            <div class="actions">
              <button class="btn btn-primary" type="submit" :disabled="chatSending">
                {{ chatSending ? 'Invio...' : 'Invia messaggio' }}
              </button>
            </div>
          </form>
        </section>
        <p v-else class="muted">Non hai i permessi per partecipare alla chat.</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.session-overview__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.session-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.grid-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.field--full {
  grid-column: 1 / -1;
}

.chat-panel {
  gap: 1rem;
}

.chat-feed {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  min-height: 200px;
  background: rgba(255, 255, 255, 0.02);
}

.chat-feed__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 380px;
  overflow-y: auto;
}

.chat-message {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
}

.chat-message.self {
  border-color: var(--color-primary, #6c63ff);
  background: rgba(108, 99, 255, 0.08);
}

.chat-message__header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
}

.chat-message__meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.chat-message__content {
  margin: 0;
  white-space: pre-wrap;
}
</style>
