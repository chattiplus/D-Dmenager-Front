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
import { useSessionChatNotifications } from '../composables/session/useSessionChatNotifications';
import { useSessionEvents } from '../composables/session/useSessionEvents';
import { useSessionRealtimeEvents } from '../composables/session/useSessionRealtimeEvents';
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
const desktopNotificationSessionId = computed(() => (isMobile.value ? null : sessionId.value));
const formatUnreadBadge = (count: number) => (count > 9 ? '9+' : String(count));

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
  applySessionEventCreated,
  applySessionEventUpdated,
  applySessionEventDeleted,
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
  startSessionEdit,
  cancelSessionEdit,
  saveSessionChanges,
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

const { unreadWhispers, unreadChat } = useSessionChatNotifications({
  sessionId: desktopNotificationSessionId,
  activeTab,
  currentUserId,
});

const {
  resources,
  resourcesLoading,
  resourcesError,
  uploadLoading,
  uploadError,
  loadResources,
  applyResourceCreated,
  uploadResource,
} = useSessionResources({
  sessionId,
  canUpload: computed(() => true),
});

useSessionRealtimeEvents({
  sessionId,
  onPlayerCharacterUpdated: applyUpdatedPlayerCharacter,
  onSessionResourceCreated: applyResourceCreated,
  onSessionEventCreated: applySessionEventCreated,
  onSessionEventUpdated: applySessionEventUpdated,
  onSessionEventDeleted: applySessionEventDeleted,
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
    <SessionDiceDrawer v-if="isMobile" />
    <div class="card stack">
      <MobileTopBar
        v-if="isMobile && session"
        title="Sessione DM"
        subtitle="Gestione sessione"
        :back-to="{ name: 'campaign-detail', params: { id: session.campaignId } }"
      />

      <header v-if="!isMobile" class="section-header session-page-header">
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
          <div class="session-overview__header-main">
            <div class="session-title-row">
              <h2 class="card-title">{{ session.title }}</h2>
              <button
                v-if="!isEditingSession && canManageContent"
                class="session-edit-button icon-button"
                type="button"
                aria-label="Modifica sessione"
                title="Modifica sessione"
                @click="startSessionEdit"
              >
                ✎
              </button>
              <button
                v-else-if="canManageContent"
                class="session-edit-button"
                type="button"
                @click="cancelSessionEdit"
              >
                Annulla
              </button>
            </div>
            <p class="section-subtitle">Sessione #{{ session.sessionNumber }}</p>
            <p class="manager-meta">
              Data pianificata: {{ session.sessionDate ?? 'Non pianificata' }}
            </p>
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
              <span>Descrizione</span>
              <textarea v-model="sessionForm.notes" rows="6" />
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
          <div class="stack">
            <p class="manager-meta session-description-label">Descrizione</p>
            <p>{{ session.notes || 'Nessuna descrizione per questa sessione.' }}</p>
          </div>
        </template>
      </section>

      <nav v-if="!isMobile" class="dm-tabs" role="tablist">
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'events' }" @click="activeTab = 'events'">
          Eventi
        </button>
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
          Chat
          <span v-if="unreadChat" class="tab-unread-badge">{{ formatUnreadBadge(unreadChat) }}</span>
        </button>
        <button type="button" class="dm-tab" :class="{ active: activeTab === 'whispers' }" @click="activeTab = 'whispers'">
          Sussurri
          <span v-if="unreadWhispers" class="tab-unread-badge">{{ formatUnreadBadge(unreadWhispers) }}</span>
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
.session-page-header {
  justify-content: flex-end;
}

.session-overview__header {
  display: flex;
  gap: 1rem;
}

.session-overview__header-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.session-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.session-title-row .card-title {
  margin: 0;
}

.session-edit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  color: var(--app-text);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-shadow) 45%, transparent);
}

.icon-button {
  width: 2.35rem;
  min-width: 2.35rem;
  padding: 0;
  font-size: 1rem;
}

.session-description-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.session-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dm-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid var(--app-surface-outline);
  margin-bottom: 1rem;
  overflow-x: auto;
  white-space: nowrap;
}

.dm-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--app-text-muted);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}

.dm-tab.active {
  color: var(--app-text);
  border-bottom-color: var(--app-accent);
}

.tab-unread-badge {
  min-width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.35rem;
  padding: 0 0.25rem;
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
  width: 100%;
}

@media (max-width: 1100px) {
  .characters-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .session-overview__header {
    flex-direction: column;
  }

  .session-title-row {
    flex-wrap: wrap;
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

