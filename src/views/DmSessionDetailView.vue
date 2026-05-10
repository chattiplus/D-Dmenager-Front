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
import { closeSession, reopenSession } from '../api/sessionsApi';
import {
  DEFAULT_LANGUAGES,
  getFontClass,
} from '../utils/sessionUi';
import { useIsMobile } from '../composables/useIsMobile';
import IconActionButton from '../components/ui/IconActionButton.vue';

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
const sessionClosed = computed(() => session.value?.status === 'CLOSED');
const canMutateLive = computed(() => canManageContent.value && !sessionClosed.value);
const chatCanSend = computed(() => canMutateLive.value);
const canReadAllWhispers = computed(() => true);
const sessionStatusLabel = computed(() => (sessionClosed.value ? 'Chiusa' : 'Aperta'));
const formattedSessionDate = computed(() => {
  if (!session.value?.sessionDate) {
    return 'Non pianificata';
  }

  const parsedDate = new Date(`${session.value.sessionDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return session.value.sessionDate;
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
});
const formattedSessionTime = computed(() => session.value?.startTime?.slice(0, 5) || null);
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
  canReadAllWhispers,
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
  visibilityUpdatingId,
  loadResources,
  applyResourceCreated,
  uploadResource,
  updateResourceVisibility,
} = useSessionResources({
  sessionId,
  canUpload: canMutateLive,
});

const toggleSessionStatusLoading = ref(false);
const toggleSessionStatus = async () => {
  if (!session.value || !canManageContent.value) {
    return;
  }

  toggleSessionStatusLoading.value = true;
  sessionError.value = '';

  try {
    session.value = sessionClosed.value
      ? await reopenSession(session.value.id)
      : await closeSession(session.value.id);
  } catch {
    sessionError.value = 'Aggiornamento stato sessione non riuscito.';
  } finally {
    toggleSessionStatusLoading.value = false;
  }
};

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

      <article v-if="session" class="card muted session-detail-card">
        <header class="session-card-header">
          <div class="session-card-title-area">
            <h2 class="session-card-title">{{ session.title }}</h2>
            <span class="session-status-pill" :class="{ closed: sessionClosed }">
              <span class="session-status-dot" aria-hidden="true"></span>
              {{ sessionStatusLabel }}
            </span>
          </div>

          <div v-if="canManageContent" class="session-card-actions">
            <template v-if="!isEditingSession">
              <button
                class="session-card-icon-button"
                type="button"
                aria-label="Modifica sessione"
                title="Modifica sessione"
                @click="startSessionEdit"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M5 17.25V19h1.75L17.06 8.69l-1.75-1.75L5 17.25Zm13.71-9.91a1 1 0 0 0 0-1.41l-.64-.64a1 1 0 0 0-1.41 0l-.79.79 1.75 1.75.79-.79Z"
                  />
                </svg>
              </button>
              <IconActionButton
                class="session-card-icon-button"
                icon="delete"
                label="Elimina sessione"
                variant="danger"
                :loading="deleteSessionLoading"
                @click="handleDeleteSession"
              />
            </template>
            <button
              v-else
              type="button"
              class="session-card-cancel-button"
              @click="cancelSessionEdit"
            >
              Annulla
            </button>
          </div>
        </header>

        <div class="session-card-divider"></div>

        <p v-if="sessionClosed" class="status-message session-closed-message">
          Sessione chiusa: non è possibile aggiungere o modificare contenuti.
        </p>

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
            <label class="field">
              <span>Ora inizio</span>
              <input v-model="sessionForm.startTime" type="time" />
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
          <section class="session-info-list" aria-label="Informazioni sessione">
            <div class="session-info-row">
              <div class="session-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M7 3h10a2 2 0 0 1 2 2v15.2a.8.8 0 0 1-1.23.67L12 17.18l-5.77 3.69A.8.8 0 0 1 5 20.2V5a2 2 0 0 1 2-2Zm0 2v12.83l4.46-2.85a1 1 0 0 1 1.08 0L17 17.83V5H7Z"
                  />
                </svg>
              </div>
              <div class="session-info-content">
                <p class="session-info-label">SESSIONE</p>
                <p class="session-info-value">#{{ session.sessionNumber }}</p>
              </div>
            </div>

            <div class="session-info-row">
              <div class="session-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 8H5v9h14v-9ZM5 8h14V6H5v2Z"
                  />
                </svg>
              </div>
              <div class="session-info-content">
                <p class="session-info-label">DATA PIANIFICATA</p>
                <p class="session-info-value">
                  {{ formattedSessionDate }}<br />
                  <span v-if="formattedSessionTime">alle {{ formattedSessionTime }}</span>
                  <span v-else>Orario non impostato</span>
                </p>
              </div>
            </div>

            <div class="session-info-row">
              <div class="session-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V7h3.5L13 3.5ZM7 11a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H7Zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H7Z"
                  />
                </svg>
              </div>
              <div class="session-info-content">
                <p class="session-info-label">DESCRIZIONE</p>
                <p class="session-info-description">
                  {{ session.notes || 'Nessuna descrizione per questa sessione.' }}
                </p>
              </div>
            </div>
          </section>

          <footer v-if="canManageContent" class="session-card-footer">
            <button
              type="button"
              class="btn btn-primary session-primary-action"
              :disabled="toggleSessionStatusLoading"
              @click="toggleSessionStatus"
            >
              {{
                toggleSessionStatusLoading
                  ? 'Aggiornamento...'
                  : sessionClosed
                    ? 'Riapri sessione'
                    : 'Chiudi sessione'
              }}
            </button>
          </footer>
        </template>
      </article>

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
          :can-manage="canMutateLive"
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
          :refresh-disabled="false"
          :show-all-messages="true"
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
          :can-upload="canMutateLive"
          :can-manage-visibility="canMutateLive"
          :upload-loading="uploadLoading"
          :upload-error="uploadError"
          :visibility-updating-id="visibilityUpdatingId"
          :access-token="authStore.accessToken"
          layout="grid"
          subtitle="Carica file (immagini, mappe, PDF) da condividere con i giocatori."
          empty-message="Nessuna risorsa caricata."
          @refresh="loadResources"
          @upload-file="uploadResource"
          @update-visibility="updateResourceVisibility"
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

.session-detail-card {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: clamp(1.2rem, 2vw, 1.75rem);
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 80%, transparent);
  border-radius: 1.35rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 82%, var(--app-surface));
  box-shadow: 0 18px 40px color-mix(in srgb, var(--app-shadow) 42%, transparent);
}

.session-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.session-card-title-area {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}

.session-card-title {
  margin: 0;
  color: var(--app-text);
  font-size: clamp(1.65rem, 4vw, 2.4rem);
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.session-card-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.session-card-icon-button,
.session-card-cancel-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  color: var(--app-text);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-shadow) 36%, transparent);
}

.session-card-icon-button {
  width: 2.6rem;
  min-width: 2.6rem;
  height: 2.6rem;
  padding: 0;
  border-radius: 999px;
}

.session-card-icon-button:not(.icon-action-button) {
  font-size: 0;
}

.session-card-icon-button svg {
  width: 1.1rem;
  height: 1.1rem;
  fill: currentColor;
}

.session-card-cancel-button {
  min-height: 2.45rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  font-weight: 800;
}

.session-card-icon-button:hover,
.session-card-cancel-button:hover {
  border-color: color-mix(in srgb, var(--app-accent) 46%, var(--app-surface-outline));
  color: var(--app-accent-strong);
}

.session-card-icon-button:focus-visible,
.session-card-cancel-button:focus-visible,
.session-primary-action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--app-accent) 70%, transparent);
  outline-offset: 3px;
}

.session-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-surface-outline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-accent) 10%, transparent);
  color: var(--app-text);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.3rem 0.65rem;
}

.session-status-pill.closed {
  border-color: var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 82%, transparent);
  color: var(--app-text-muted);
}

.session-status-dot {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
  background: var(--app-accent);
  box-shadow: 0 0 0.55rem color-mix(in srgb, var(--app-accent) 42%, transparent);
}

.session-status-pill.closed .session-status-dot {
  background: var(--app-text-muted);
  box-shadow: none;
}

.session-card-divider {
  position: relative;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--app-surface-outline) 85%, transparent),
    transparent
  );
}

.session-card-divider::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3rem;
  height: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-accent) 55%, transparent);
  content: "";
  transform: translate(-50%, -50%);
}

.session-closed-message {
  margin: 0;
}

.session-info-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.session-info-row {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  gap: 0.9rem;
  align-items: start;
  padding: 0.85rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--app-surface-outline) 52%, transparent);
}

.session-info-row:last-child {
  border-bottom: none;
}

.session-info-icon {
  display: grid;
  place-items: center;
  width: 2.65rem;
  height: 2.65rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 32%, var(--app-surface-outline));
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-accent) 12%, var(--app-surface-elevated));
  color: var(--app-accent-strong);
}

.session-info-icon svg {
  width: 1.2rem;
  height: 1.2rem;
  fill: currentColor;
}

.session-info-label {
  margin: 0 0 0.25rem;
  color: var(--app-text-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.session-info-value {
  margin: 0;
  color: var(--app-text);
  font-size: clamp(1.05rem, 2vw, 1.25rem);
  font-weight: 800;
  line-height: 1.35;
}

.session-info-value span {
  color: var(--app-text-muted);
  font-weight: 700;
}

.session-info-description {
  margin: 0;
  color: var(--app-text);
  font-size: 1rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.session-card-footer {
  margin-top: 0.35rem;
  padding-top: 0.95rem;
  border-top: 1px solid color-mix(in srgb, var(--app-surface-outline) 58%, transparent);
}

.session-primary-action {
  display: flex;
  width: min(88%, 16.25rem);
  min-height: 2.35rem;
  margin-inline: auto;
  padding: 0.55rem 1.1rem;
  justify-content: center;
  border-radius: 0.85rem;
  font-size: 0.9rem;
  font-weight: 650;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-shadow) 28%, transparent);
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
  .session-detail-card {
    padding: 1rem;
    border-radius: 1.1rem;
  }

  .session-card-header {
    gap: 0.75rem;
  }

  .session-card-actions {
    gap: 0.35rem;
  }

  .session-card-icon-button {
    width: 2.45rem;
    min-width: 2.45rem;
    height: 2.45rem;
  }

  .session-info-row {
    grid-template-columns: 2.45rem minmax(0, 1fr);
    gap: 0.75rem;
  }

  .session-info-icon {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 0.85rem;
  }
}

@media (max-width: 520px) {
  .session-card-title {
    font-size: 1.55rem;
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

