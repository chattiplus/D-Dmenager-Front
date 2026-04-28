<!-- src/views/DmSessionDetailView.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../store/authStore';
import {
  deleteSession,
  updateSession,
} from '../api/sessionsApi';
import { getCampaignById } from '../api/campaignsApi';
import { getCharacterById, getMyCharacters } from '../api/charactersApi';
import { getNpcsByWorld } from '../api/npcsApi';
import SessionCharacterSheet from '../components/SessionCharacterSheet.vue';
import SessionChatPanel from '../components/session/SessionChatPanel.vue';
import SessionEventsPanel from '../components/session/SessionEventsPanel.vue';
import SessionResourcesPanel from '../components/session/SessionResourcesPanel.vue';
import SessionWhispersPanel from '../components/session/SessionWhispersPanel.vue';
import DmCharacterSheetsPanel from '../components/session/dm/DmCharacterSheetsPanel.vue';
import { useSessionBase } from '../composables/session/useSessionBase';
import { useSessionChat } from '../composables/session/useSessionChat';
import { useSessionEvents } from '../composables/session/useSessionEvents';
import { useSessionResources } from '../composables/session/useSessionResources';
import type {
  CampaignPlayerResponse,
  CreateSessionRequest,
  NpcResponse,
  PlayerCharacterResponse,
  SessionResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import {
  DEFAULT_LANGUAGES,
  getFontClass,
} from '../utils/sessionUi';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { canManageContent } = storeToRefs(authStore);

const sessionId = computed(() => {
  const parsed = Number(route.params.id);
  return Number.isNaN(parsed) ? null : parsed;
});

const npcs = ref<NpcResponse[]>([]);
const npcsLoading = ref(false);
const selectedSheetCharacter = ref<NpcResponse | PlayerCharacterResponse | null>(null);
const selectedSheetType = ref<'PC' | 'NPC'>('PC');
const playerSheetCharacters = ref<Record<number, PlayerCharacterResponse>>({});
const loadingPlayerSheetId = ref<number | null>(null);
const playerSheetError = ref('');

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
const myCharacters = ref<PlayerCharacterResponse[]>([]);

const chatPanelRef = ref<any>(null);
const whispersPanelRef = ref<any>(null);

const activeTab = ref<'events' | 'chat' | 'whispers' | 'resources' | 'characters'>('events');

const {
  session,
  sessionError,
  sessionLoading,
  campaignName,
  campaignError,
  campaignPlayers,
  campaignPlayersError,
  loadSession,
} = useSessionBase({
  sessionId,
  invalidSessionMessage: 'ID sessione non valido.',
});

const chatCharacterOptions = computed(() =>
  myCharacters.value.map((character) => ({
    id: character.id,
    label: character.name,
  })),
);
const chatLanguageOptions = computed(() => DEFAULT_LANGUAGES);
const chatCanSend = computed(() => canManageContent.value);
const currentUserId = computed(() => authStore.profile?.id ?? null);

const availablePrivateRecipients = computed(() => {
  const map = new Map();

  campaignPlayers.value.forEach((player) => {
    if (player.playerId && player.status === 'APPROVED') {
      if (!map.has(player.playerId)) {
        map.set(player.playerId, {
          userId: player.playerId,
          nickname: player.playerNickname,
          characterName: player.characterName,
        });
      }
    }
  });

  return Array.from(map.values());
});

const loadNpcs = async (worldId: number) => {
  npcsLoading.value = true;
  try {
    npcs.value = await getNpcsByWorld(worldId);
  } catch (error) {
    console.error('Failed to load NPCs', error);
  } finally {
    npcsLoading.value = false;
  }
};

const selectSheetCharacter = (character: PlayerCharacterResponse | NpcResponse, type: 'PC' | 'NPC') => {
  selectedSheetCharacter.value = character;
  selectedSheetType.value = type;
};

const updateCampaignPlayerCharacterData = (updatedCharacter: PlayerCharacterResponse) => {
  campaignPlayers.value = campaignPlayers.value.map((player) => {
    if (player.characterId !== updatedCharacter.id || !player.characterData) {
      return player;
    }

    return {
      ...player,
      characterData: updatedCharacter,
    };
  });
};

const applyUpdatedPlayerCharacter = (updatedCharacter: PlayerCharacterResponse) => {
  playerSheetCharacters.value = {
    ...playerSheetCharacters.value,
    [updatedCharacter.id]: updatedCharacter,
  };

  if (
    selectedSheetType.value === 'PC' &&
    selectedSheetCharacter.value?.id === updatedCharacter.id
  ) {
    selectedSheetCharacter.value = updatedCharacter;
  }

  updateCampaignPlayerCharacterData(updatedCharacter);
  playerSheetError.value = '';
};

const resolvePlayerCharacter = async (
  player: CampaignPlayerResponse,
): Promise<PlayerCharacterResponse | null> => {
  if (player.characterData) {
    return player.characterData;
  }

  if (!player.characterId) {
    return null;
  }

  const cached = playerSheetCharacters.value[player.characterId];
  if (cached) {
    return cached;
  }

  loadingPlayerSheetId.value = player.characterId;
  playerSheetError.value = '';

  try {
    const character = await getCharacterById(player.characterId);
    applyUpdatedPlayerCharacter(character);
    return character;
  } catch (error) {
    playerSheetError.value = extractApiErrorMessage(
      error,
      'Impossibile caricare la scheda del personaggio.',
    );
    return null;
  } finally {
    loadingPlayerSheetId.value = null;
  }
};

const selectPlayerSheetCharacter = async (player: CampaignPlayerResponse) => {
  const character = await resolvePlayerCharacter(player);
  if (!character) {
    return;
  }

  selectSheetCharacter(character, 'PC');
};

const refreshSelectedSheetCharacter = async () => {
  if (!selectedSheetCharacter.value || selectedSheetType.value !== 'PC') {
    return;
  }

  const characterId = selectedSheetCharacter.value.id;
  if (!characterId) {
    return;
  }

  try {
    const updatedCharacter = await getCharacterById(characterId);
    applyUpdatedPlayerCharacter(updatedCharacter);
  } catch (error) {
    playerSheetError.value = extractApiErrorMessage(
      error,
      'Impossibile aggiornare la scheda del personaggio.',
    );
  }
};

watch(session, async (value) => {
  if (!value) {
    return;
  }

  populateSessionForm(value);

  try {
    const campaign = await getCampaignById(value.campaignId);
    loadNpcs(campaign.worldId);
  } catch (error) {
    console.error('Failed to load campaign/world info for NPCs', error);
  }
});

const {
  events,
  eventsError,
  loadingEvents,
  eventForm,
  eventFormError,
  submittingEvent,
  editingEventId,
  loadEvents,
  submitEvent,
  startEventEdit,
  cancelEventEdit,
  removeEvent,
} = useSessionEvents({
  sessionId,
  canManageContent,
});

const populateSessionForm = (data: SessionResponse) => {
  sessionForm.title = data.title;
  sessionForm.sessionNumber = data.sessionNumber;
  sessionForm.sessionDate = data.sessionDate ?? '';
  sessionForm.notes = data.notes ?? '';
};

const resetDmSheetSelectionState = () => {
  playerSheetCharacters.value = {};
  selectedSheetCharacter.value = null;
  selectedSheetType.value = 'PC';
  playerSheetError.value = '';
  loadingPlayerSheetId.value = null;
};

const loadMyCharacters = async () => {
  try {
    myCharacters.value = await getMyCharacters();
  } catch (error) {
    console.error('Failed to load DM characters', error);
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

const getActiveChatContainer = () => {
  if (activeTab.value === 'whispers') {
    return whispersPanelRef.value?.scrollContainerRef ?? null;
  }

  return chatPanelRef.value?.scrollContainerRef ?? null;
};

const {
  messages: sessionMessages,
  loading: sessionChatLoading,
  error: sessionChatError,
  sending: sessionChatSending,
  form: sessionChatForm,
  privateRecipientId: selectedPrivateRecipientId,
  fetch: refreshSessionChat,
  send: sendSessionMessage,
} = useSessionChat({
  sessionId,
  activeTab,
  canSend: chatCanSend,
  getScrollContainer: getActiveChatContainer,
  loadErrorMessage: 'Impossibile caricare la chat.',
  sendErrorMessage: 'Invio messaggio non riuscito.',
  emptyMessageError: 'Inserisci un messaggio.',
});

const {
  resources,
  resourcesLoading,
  resourcesError,
  uploadLoading,
  uploadError,
  loadResources,
  uploadResource,
} = useSessionResources({
  sessionId,
  canUpload: computed(() => true),
});

watch(
  sessionId,
  (id) => {
    if (!id) {
      resetDmSheetSelectionState();
      return;
    }

    resetDmSheetSelectionState();
    loadSession();
    loadEvents();
    loadResources();
    loadMyCharacters();
  },
  { immediate: true },
);

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === 'resources') {
      loadResources();
    } else if (tab === 'characters') {
      await refreshSelectedSheetCharacter();
    }
  },
);
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
            <p class="section-subtitle">Sessione #{{ session.sessionNumber }}</p>
            <h2 class="card-title">{{ session.title }}</h2>
            <p class="manager-meta">Campagna: {{ campaignName || `ID ${session.campaignId}` }}</p>
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
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'events' }" @click="activeTab = 'events'">
          Eventi
        </button>
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
          Chat
        </button>
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'whispers' }" @click="activeTab = 'whispers'">
          Sussurri
        </button>
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'resources' }" @click="activeTab = 'resources'">
          Risorse
        </button>
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'characters' }" @click="activeTab = 'characters'">
          Personaggi
        </button>
      </nav>

      <section v-if="activeTab === 'events'" class="dm-tab-panel stack">
        <SessionEventsPanel
          :events="events"
          :loading="loadingEvents"
          :error="eventsError"
          :can-manage="canManageContent"
          :form="eventForm"
          :form-error="eventFormError"
          :submitting="submittingEvent"
          :editing-event-id="editingEventId"
          @refresh="loadEvents"
          @submit="submitEvent"
          @edit="startEventEdit"
          @cancel-edit="cancelEventEdit"
          @delete="removeEvent"
        />
      </section>

      <section v-else-if="activeTab === 'chat'" class="dm-tab-panel">
        <p v-if="campaignPlayersError" class="status-message text-danger">{{ campaignPlayersError }}</p>
        <SessionChatPanel
          ref="chatPanelRef"
          variant="dm"
          :messages="sessionMessages"
          :loading="sessionChatLoading"
          :error="sessionChatError"
          :can-send="chatCanSend"
          :current-user-id="currentUserId"
          :character-options="chatCharacterOptions"
          :language-options="chatLanguageOptions"
          :sending="sessionChatSending"
          :content="sessionChatForm.content"
          :selected-character-id="sessionChatForm.senderCharacterId"
          :selected-language="sessionChatForm.language"
          subtitle="Usa i messaggi per coordinare i giocatori durante la sessione live (Globale)."
          empty-message="Ancora nessun messaggio. Inizia la conversazione!"
          :message-content-class="(message) => getFontClass(message.language)"
          :show-sender-character-name="true"
          @refresh="refreshSessionChat({ showLoader: true })"
          @send="sendSessionMessage"
          @update:content="sessionChatForm.content = $event"
          @update:selected-character-id="sessionChatForm.senderCharacterId = $event"
          @update:selected-language="sessionChatForm.language = $event"
        />
      </section>

      <section v-else-if="activeTab === 'whispers'" class="dm-tab-panel">
        <SessionWhispersPanel
          ref="whispersPanelRef"
          variant="dm"
          :recipients="availablePrivateRecipients"
          :selected-recipient-id="selectedPrivateRecipientId"
          :messages="sessionMessages"
          :loading="sessionChatLoading"
          :error="sessionChatError"
          :can-send="chatCanSend"
          :current-user-id="currentUserId"
          :character-options="chatCharacterOptions"
          :language-options="chatLanguageOptions"
          :sending="sessionChatSending"
          :content="sessionChatForm.content"
          :selected-character-id="sessionChatForm.senderCharacterId"
          :selected-language="sessionChatForm.language"
          subtitle="Scegli un giocatore per inviare messaggi privati."
          empty-recipient-message="Seleziona un giocatore per iniziare un sussurro."
          empty-messages-message="Nessun messaggio privato con questo giocatore."
          :refresh-disabled="!selectedPrivateRecipientId"
          :show-sender-character-name="true"
          :message-content-class="(message) => getFontClass(message.language)"
          @refresh="refreshSessionChat({ showLoader: true })"
          @send="sendSessionMessage"
          @update:selected-recipient-id="selectedPrivateRecipientId = $event"
          @update:content="sessionChatForm.content = $event"
          @update:selected-character-id="sessionChatForm.senderCharacterId = $event"
          @update:selected-language="sessionChatForm.language = $event"
        />
      </section>

      <section v-else-if="activeTab === 'resources'" class="dm-tab-panel">
        <SessionResourcesPanel
          :resources="resources"
          :loading="resourcesLoading"
          :error="resourcesError"
          :can-upload="true"
          :upload-loading="uploadLoading"
          :upload-error="uploadError"
          :access-token="authStore.accessToken"
          layout="grid"
          subtitle="Carica file (immagini, mappe, PDF) da condividere con i giocatori."
          empty-message="Nessuna risorsa caricata."
          @refresh="loadResources"
          @upload-file="uploadResource"
        />
      </section>

      <section v-else-if="activeTab === 'characters'" class="dm-tab-panel">
        <div class="characters-layout">
          <DmCharacterSheetsPanel
            :campaign-players="campaignPlayers"
            :npcs="npcs"
            :selected-sheet-character="selectedSheetCharacter"
            :selected-sheet-type="selectedSheetType"
            :loading-player-sheet-id="loadingPlayerSheetId"
            :player-sheet-error="playerSheetError"
            @select-player-character="selectPlayerSheetCharacter"
            @select-npc-character="selectSheetCharacter($event, 'NPC')"
          />

          <div class="characters-main stack">
            <div v-if="!selectedSheetCharacter" class="muted p-2 text-center">
              Seleziona un personaggio o NPC per visualizzare la scheda.
            </div>
            <SessionCharacterSheet
              v-else
              :character="selectedSheetCharacter"
              :type="selectedSheetType"
              :is-gm="true"
              @character-updated="applyUpdatedPlayerCharacter"
            />
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.session-overview__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.session-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dm-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.dm-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.6);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
}

.dm-tab.active {
  color: white;
  border-bottom-color: var(--color-primary, #6c63ff);
}

.dm-tab-panel {
  animation: fadeIn 0.2s;
}

.characters-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 1rem;
  align-items: start;
}

.characters-main {
  gap: 1rem;
}

@media (max-width: 768px) {
  .characters-layout {
    grid-template-columns: 1fr;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>

