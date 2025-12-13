<!-- src/views/SessionDetailView.vue -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
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
import { getSessionById } from '../api/sessionsApi';
import { getCampaignPlayers } from '../api/campaignPlayersApi';
import { getMyCharacters } from '../api/charactersApi';
import { getSessionChatMessages, sendSessionChatMessage } from '../api/sessionChatApi';
import type {
  CampaignPlayerResponse,
  CreateSessionEventRequest,
  PlayerCharacterResponse,
  SessionChatMessageResponse,
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

const campaignId = ref<number | null>(null);

const events = ref<SessionEventResponse[]>([]);
const eventsError = ref('');
const loadingEvents = ref(false);

const sessionInfo = ref<SessionResponse | null>(null);
const sessionInfoError = ref('');
const sessionInfoLoading = ref(false);
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

const activeTab = ref<'events' | 'chat'>('events');

const campaignPlayers = ref<CampaignPlayerResponse[]>([]);
const myCharacters = ref<PlayerCharacterResponse[]>([]);
const chatMessages = ref<SessionChatMessageResponse[]>([]);
const chatError = ref('');
const chatLoading = ref(false);
const chatSending = ref(false);
const chatForm = reactive({
  content: '',
  language: 'COMMON',
  senderCharacterId: null as number | null,
  messageType: 'IC',
});
const selectedCharacterId = ref<number | string | null>(null);
let chatInterval: ReturnType<typeof setInterval> | null = null;

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

const currentUserId = computed(() => authStore.profile?.id ?? null);

const playerCharacterOptions = computed(() => {
  if (canMutate.value || !currentUserId.value) {
    return [];
  }
  return campaignPlayers.value
    .filter(
      (player) =>
        player.status === 'APPROVED' &&
        player.playerId === currentUserId.value &&
        player.characterId,
    )
    .map((player) => ({
      id: player.characterId as number,
      label: player.characterName ?? 'Personaggio',
    }));
});

const myCharacterLanguageMap = computed(() => {
  const map = new Map<number, string[]>();
  myCharacters.value.forEach((character) => {
    map.set(
      character.id,
      character.knownLanguages?.length ? character.knownLanguages : ['COMMON'],
    );
  });
  return map;
});

const availableChatLanguages = computed(() => {
  if (canMutate.value) {
    return DEFAULT_LANGUAGES;
  }
  const rawId = selectedCharacterId.value;
  const numericId =
    rawId === null || rawId === undefined || rawId === ''
      ? null
      : typeof rawId === 'number'
        ? rawId
        : Number(rawId);
  if (numericId && myCharacterLanguageMap.value.has(numericId)) {
    return myCharacterLanguageMap.value.get(numericId) ?? ['COMMON'];
  }
  return ['COMMON'];
});

const chatCanSend = computed(() => {
  if (canMutate.value) {
    return true;
  }
  return !!selectedCharacterId.value;
});

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

const loadCampaignPlayers = async (campaign: number) => {
  try {
    campaignPlayers.value = await getCampaignPlayers(campaign);
  } catch {
    campaignPlayers.value = [];
  }
};

const loadMyCharacters = async () => {
  if (canMutate.value) {
    return;
  }
  try {
    myCharacters.value = await getMyCharacters();
  } catch {
    myCharacters.value = [];
  }
};

const loadSessionContext = async () => {
  if (!sessionId.value) {
    sessionInfoError.value = 'ID sessione non valido.';
    return;
  }
  sessionInfoLoading.value = true;
  sessionInfoError.value = '';
  try {
    const session = await getSessionById(sessionId.value);
    sessionInfo.value = session;
    campaignId.value = session.campaignId;
    const campaign = await getCampaignById(session.campaignId);
    campaignName.value = campaign.name;
    await Promise.all([loadCampaignPlayers(session.campaignId), loadMyCharacters()]);
  } catch (error) {
    sessionInfo.value = null;
    campaignName.value = '';
    sessionInfoError.value = extractApiErrorMessage(
      error,
      'Errore nel recupero dei dati della sessione.',
    );
  } finally {
    sessionInfoLoading.value = false;
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
  resetEventForm();
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

const updateChatMessages = (messages: SessionChatMessageResponse[]) => {
  chatMessages.value = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

const fetchChatMessages = async () => {
  if (!sessionId.value) {
    return;
  }
  chatLoading.value = true;
  chatError.value = '';
  try {
    const data = await getSessionChatMessages(sessionId.value);
    updateChatMessages(data);
  } catch (error) {
    chatError.value = extractApiErrorMessage(error, 'Impossibile caricare la chat.');
  } finally {
    chatLoading.value = false;
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
    updateChatMessages([...chatMessages.value, message]);
    chatForm.content = '';
  } catch (error) {
    chatError.value = extractApiErrorMessage(error, 'Invio messaggio non riuscito.');
  } finally {
    chatSending.value = false;
  }
};

const startChatPolling = () => {
  if (chatInterval || activeTab.value !== 'chat') {
    return;
  }
  fetchChatMessages();
  chatInterval = setInterval(fetchChatMessages, 8000);
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
    loadSessionContext();
    loadEvents();
  },
  { immediate: true },
);

watch(
  playerCharacterOptions,
  (options) => {
    if (canMutate.value) {
      return;
    }
    selectedCharacterId.value = options[0]?.id ?? null;
  },
  { immediate: true },
);

watch(
  () => selectedCharacterId.value,
  (id) => {
    const normalized =
      id === null || id === undefined || id === '' ? null : Number(id);
    chatForm.senderCharacterId = normalized;
    const langs = availableChatLanguages.value;
    const fallbackLanguage = langs[0];
    if (fallbackLanguage && !langs.includes(chatForm.language)) {
      chatForm.language = fallbackLanguage;
    }
  },
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
      <header>
        <h1 class="section-title">Sessione</h1>
        <p class="section-subtitle">
          Session ID: {{ sessionId ?? route.params.id }}
          <span v-if="campaignName">- Campagna: {{ campaignName }}</span>
        </p>
      </header>

      <p v-if="sessionInfoError" class="status-message text-danger">{{ sessionInfoError }}</p>
      <p v-else-if="sessionInfoLoading" class="muted">Caricamento sessione...</p>

      <article v-if="sessionInfo" class="card muted stack">
        <p class="section-subtitle">Sessione #{{ sessionInfo.sessionNumber }}</p>
        <h2 class="card-title">{{ sessionInfo.title }}</h2>
        <p class="manager-meta">Data: {{ sessionInfo.sessionDate ?? 'Non pianificata' }}</p>
        <p>{{ sessionInfo.notes || 'Nessuna nota per questa sessione.' }}</p>
      </article>

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
            <h3>Timeline</h3>
            <p class="section-subtitle">Gli eventi registrati per questa sessione.</p>
          </div>
          <button class="btn btn-link" @click="loadEvents" :disabled="loadingEvents">
            Aggiorna eventi
          </button>
        </header>

        <p v-if="eventsError" class="status-message text-danger">{{ eventsError }}</p>
        <ul v-else-if="events.length" class="manager-list">
          <li v-for="event in events" :key="event.id" class="compact-card">
            <header class="section-header">
              <div>
                <p class="card-title">{{ event.title }}</p>
                <p class="manager-meta">
                  {{ event.type || 'Evento' }} - {{ event.inGameTime || 'Tempo non indicato' }}
                </p>
              </div>
              <small class="tag tag-muted">{{ new Date(event.createdAt).toLocaleString() }}</small>
            </header>
            <p>{{ event.description || 'Nessuna descrizione.' }}</p>
            <p class="manager-meta">
              Visibile ai player: {{ event.isVisibleToPlayers ? 'Sì' : 'No' }}
            </p>
            <p class="manager-meta">
              Owner: {{ event.ownerNickname ?? 'N/D' }} (#{{ event.ownerId ?? '—' }})
            </p>
            <div v-if="canMutate" class="actions">
              <button class="btn btn-link" type="button" @click="startEditing(event)">
                Modifica
              </button>
              <button class="btn btn-link text-danger" type="button" @click="removeEvent(event.id)">
                Elimina
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="muted">Nessun evento registrato per questa sessione.</p>

        <section v-if="canMutate" class="card muted stack">
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
              <button class="btn btn-secondary" type="submit" :disabled="submittingEvent">
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
                @click="cancelEditing"
              >
                Annulla modifica
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
              Comunica in tempo reale con il gruppo usando le lingue disponibili.
            </p>
          </div>
          <button class="btn btn-link" type="button" @click="fetchChatMessages">
            Aggiorna chat
          </button>
        </header>

        <p v-if="chatError" class="status-message text-danger">{{ chatError }}</p>

        <div class="chat-feed">
          <p v-if="chatLoading" class="muted">Caricamento messaggi...</p>
          <p v-else-if="!chatMessages.length" class="muted">
            Ancora nessun messaggio. Scrivine uno per iniziare!
          </p>
          <ul v-else class="chat-feed__list">
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
              <p class="chat-message__content">{{ message.contentVisible }}</p>
            </li>
          </ul>
        </div>

        <section v-if="chatCanSend" class="card muted stack">
          <h4 class="card-title">Invia messaggio</h4>
          <form class="stack" @submit.prevent="sendChatMessage">
            <label v-if="!canMutate" class="field">
              <span>Personaggio</span>
              <select v-model="selectedCharacterId" required>
                <option disabled value="">Seleziona il personaggio</option>
                <option v-for="option in playerCharacterOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>Lingua</span>
              <select v-model="chatForm.language">
                <option v-for="language in availableChatLanguages" :key="language" :value="language">
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
        <p v-else class="muted">
          Non hai un personaggio approvato per questa campagna, quindi non puoi partecipare alla chat.
        </p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.chat-panel {
  gap: 1rem;
}

.chat-feed {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  min-height: 200px;
}

.chat-feed__list {
  list-style: none;
  padding: 0;
  margin: 0;
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
