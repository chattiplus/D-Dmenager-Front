<!-- src/views/DmSessionDetailView.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../store/authStore';
import MobileTopBar from '../components/mobile/MobileTopBar.vue';
import SessionCharacterSheet from '../components/SessionCharacterSheet.vue';
import SessionDiceDrawer from '../components/session/SessionDiceDrawer.vue';
import SessionChatPanel from '../components/session/SessionChatPanel.vue';
import SessionEventsPanel from '../components/session/SessionEventsPanel.vue';
import SessionResourcesPanel from '../components/session/SessionResourcesPanel.vue';
import SessionWhispersPanel from '../components/session/SessionWhispersPanel.vue';
import DmCharacterSheetsPanel from '../components/session/dm/DmCharacterSheetsPanel.vue';
import { useSessionBase } from '../composables/session/useSessionBase';
import { useDmSessionCharacters } from '../composables/session/useDmSessionCharacters';
import { useDmSessionEditor } from '../composables/session/useDmSessionEditor';
import { useSessionChat } from '../composables/session/useSessionChat';
import { useSessionEvents } from '../composables/session/useSessionEvents';
import { useSessionResources } from '../composables/session/useSessionResources';
import {
  DEFAULT_LANGUAGES,
  getFontClass,
} from '../utils/sessionUi';
import { useIsMobile } from '../composables/useIsMobile';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isMobile } = useIsMobile();
const { canManageContent } = storeToRefs(authStore);

const sessionId = computed(() => {
  const parsed = Number(route.params.id);
  return Number.isNaN(parsed) ? null : parsed;
});

const chatPanelRef = ref<any>(null);
const whispersPanelRef = ref<any>(null);

const activeTab = ref<'events' | 'chat' | 'whispers' | 'resources' | 'characters'>('events');
const allowedTabs = ['events', 'chat', 'whispers', 'resources', 'characters'] as const;

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

const {
  isEditingSession,
  sessionForm,
  sessionFormError,
  saveSessionLoading,
  deleteSessionLoading,
  startSessionEdit,
  cancelSessionEdit,
  saveSessionChanges,
  handleDeleteSession,
} = useDmSessionEditor({
  sessionId,
  session,
  sessionError,
  onDeleted: async (campaignId) => {
    await router.push({ name: 'campaign-detail', params: { id: campaignId } });
  },
});

const {
  npcs,
  selectedSheetCharacter,
  selectedSheetType,
  loadingPlayerSheetId,
  playerSheetError,
  chatCharacterOptions,
  selectSheetCharacter,
  applyUpdatedPlayerCharacter,
  applyUpdatedNpcCharacter,
  selectPlayerSheetCharacter,
  refreshSelectedSheetCharacter,
  resetDmSheetSelectionState,
} = useDmSessionCharacters({
  campaignPlayers,
  session,
});

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

watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab === 'string' && allowedTabs.includes(tab as typeof allowedTabs[number])) {
      activeTab.value = tab as typeof activeTab.value;
    }
  },
  { immediate: true },
);

watch(
  activeTab,
  (tab) => {
    if (route.query.tab === tab) {
      return;
    }

    router.replace({
      query: {
        ...route.query,
        tab,
      },
    }).catch(() => undefined);
  },
);
</script>

<template>
  <section class="stack">
    <SessionDiceDrawer />
    <div class="card stack">
      <MobileTopBar
        v-if="isMobile && session"
        :title="session.title"
        :subtitle="campaignName || `Campagna ${session.campaignId}`"
        :back-to="{ name: 'campaign-detail', params: { id: session.campaignId } }"
      />

      <header v-if="!isMobile" class="section-header">
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

      <nav v-if="!isMobile" class="dm-tabs" role="tablist">
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
              @npc-updated="applyUpdatedNpcCharacter"
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
  overflow-x: auto;
  white-space: nowrap;
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
  min-width: 0;
}

.characters-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 1rem;
  align-items: start;
  min-width: 0;
}

.characters-main {
  gap: 1rem;
  min-width: 0;
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

