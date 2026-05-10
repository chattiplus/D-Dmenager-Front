<!-- src/views/SessionDetailView.vue -->
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
import { useSessionBase } from '../composables/session/useSessionBase';
import { useSessionChat } from '../composables/session/useSessionChat';
import { useSessionChatNotifications } from '../composables/session/useSessionChatNotifications';
import { useSessionEvents } from '../composables/session/useSessionEvents';
import { usePlayerSessionCharacter } from '../composables/session/usePlayerSessionCharacter';
import { useSessionRealtimeEvents } from '../composables/session/useSessionRealtimeEvents';
import { useSessionResources } from '../composables/session/useSessionResources';
import type {
  SessionChatMessageResponse,
} from '../types/api';
import {
  ALL_LANGUAGES,
  getFontClass,
  scrambleText,
} from '../utils/sessionUi';
import { useIsMobile } from '../composables/useIsMobile';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isMobile } = useIsMobile();
const { profile } = storeToRefs(authStore);

const sessionId = computed(() => {
  const parsed = Number(route.params.id);
  return Number.isNaN(parsed) ? null : parsed;
});

const chatPanelRef = ref<any>(null);
const whispersPanelRef = ref<any>(null);
const playerSenderCharacterId = ref<number | null>(null);

const activeTab = ref<'events' | 'chat' | 'whispers' | 'resources' | 'sheet'>('events');
const allowedTabs = ['events', 'chat', 'whispers', 'resources', 'sheet'] as const;

const {
  session,
  sessionError,
  sessionLoading,
  campaignName,
  campaignPlayers,
  loadSession,
} = useSessionBase({
  sessionId,
});

const currentUserId = computed(() => profile.value?.id ?? null);
const desktopNotificationSessionId = computed(() => (isMobile.value ? null : sessionId.value));
const formatUnreadBadge = (count: number) => (count > 9 ? '9+' : String(count));
const sessionClosed = computed(() => session.value?.status === 'CLOSED');
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
const isSessionOwner = computed(() => {
  return Boolean(session.value && profile.value && session.value.ownerId === profile.value.id);
});

const chatLanguageOptions = computed(() => {
  if (session.value && session.value.ownerId === currentUserId.value) {
    return ALL_LANGUAGES;
  }

  const myCharacter = campaignPlayers.value.find((player) => player.playerId === currentUserId.value);
  if (!myCharacter) {
    return ['COMMON'];
  }

  const languages = new Set(['COMMON']);
  if (myCharacter.knownLanguages) {
    myCharacter.knownLanguages.forEach((language) => languages.add(language));
  }

  return Array.from(languages);
});

const canReadMessage = (message: SessionChatMessageResponse) => {
  if (message.senderUserId === currentUserId.value) return true;
  if (session.value && session.value.ownerId === currentUserId.value) return true;
  if (!message.language || message.language === 'COMMON') return true;

  const myCharacter = campaignPlayers.value.find((player) => player.playerId === currentUserId.value);
  if (myCharacter?.knownLanguages?.includes(message.language)) {
    return true;
  }

  return false;
};

const renderPlayerChatMessage = (message: SessionChatMessageResponse) =>
  canReadMessage(message) ? message.contentVisible : scrambleText(message.contentVisible);

const getPlayerChatMessageClass = (message: SessionChatMessageResponse) => [
  getFontClass(message.language),
  { 'scrambled-text': !canReadMessage(message) },
];

const availablePrivateRecipients = computed(() => {
  const currentId = currentUserId.value;
  const map = new Map();

  if (session.value && session.value.ownerId !== currentId) {
    map.set(session.value.ownerId, {
      userId: session.value.ownerId,
      nickname: session.value.ownerNickname ?? 'Master',
      characterName: 'Dungeon Master',
    });
  }

  campaignPlayers.value.forEach((player) => {
    if (player.playerId && player.playerId !== currentId && player.status === 'APPROVED') {
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

const getActiveChatContainer = () => {
  if (activeTab.value === 'whispers') {
    return whispersPanelRef.value?.scrollContainerRef ?? null;
  }

  return chatPanelRef.value?.scrollContainerRef ?? null;
};

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
} = useSessionEvents({
  sessionId,
  canManageContent: computed(() => false),
});

const {
  resources,
  resourcesLoading,
  resourcesError,
  uploadLoading,
  uploadError,
  loadResources,
  applyResourceCreated,
} = useSessionResources({
  sessionId,
  canUpload: computed(() => false),
});

const {
  currentPlayerCharacterId,
  currentPlayerCharacter,
  availableCharacters,
  refreshCurrentPlayerCharacter,
  handleCharacterUpdated,
} = usePlayerSessionCharacter({
  campaignPlayers,
  currentUserId,
  isSessionOwner,
  setSenderCharacterId: (characterId) => {
    playerSenderCharacterId.value = characterId;
  },
});

useSessionRealtimeEvents({
  sessionId,
  onPlayerCharacterUpdated: handleCharacterUpdated,
  onSessionResourceCreated: applyResourceCreated,
  onSessionEventCreated: applySessionEventCreated,
  onSessionEventUpdated: applySessionEventUpdated,
  onSessionEventDeleted: applySessionEventDeleted,
});

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
  canSend: computed(() => !sessionClosed.value),
  currentPlayerCharacterId,
  getScrollContainer: getActiveChatContainer,
  loadErrorMessage: 'Errore chat.',
  sendErrorMessage: 'Errore invio.',
  emptyMessageError: 'Inserisci un messaggio.',
});

const { unreadWhispers, unreadChat } = useSessionChatNotifications({
  sessionId: desktopNotificationSessionId,
  activeTab,
  currentUserId,
});

watch(
  playerSenderCharacterId,
  (characterId) => {
    sessionChatForm.senderCharacterId = characterId;
  },
  { immediate: true },
);

watch(
  sessionId,
  (id) => {
    if (id) {
      loadSession();
      loadEvents();
      loadResources();
    }
  },
  { immediate: true },
);

watch(
  () => activeTab.value,
  (tab) => {
    if (tab === 'resources') {
      loadResources();
    } else if (tab === 'sheet') {
      refreshCurrentPlayerCharacter();
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
  <div class="stack">
    <SessionDiceDrawer v-if="isMobile" />
    <div class="card stack">
      <MobileTopBar
        v-if="isMobile && session"
        :title="session.title"
        :subtitle="campaignName || 'Sessione'"
        :back-to="{ name: 'campaign-detail', params: { id: session.campaignId } }"
      />

      <header v-if="!isMobile" class="section-header">
        <div>
          <h1 class="section-title">{{ session?.title ?? 'Dettaglio Sessione' }}</h1>
          <p class="section-subtitle" v-if="campaignName">Campagna: {{ campaignName }}</p>
        </div>
        <RouterLink
          v-if="session"
          class="btn btn-link"
          :to="{ name: 'campaign-detail', params: { id: session.campaignId } }"
        >
          Indietro
        </RouterLink>
      </header>

      <div v-if="sessionLoading" class="muted">Caricamento...</div>
      <div v-if="sessionError" class="text-danger">{{ sessionError }}</div>

      <template v-if="session">
        <article class="player-session-card">
          <header class="player-session-card__header">
            <div class="player-session-card__title-area">
              <h2 class="player-session-card__title">{{ session.title }}</h2>
              <span class="session-status-pill" :class="{ closed: sessionClosed }">
                <span class="session-status-dot" aria-hidden="true"></span>
                {{ sessionStatusLabel }}
              </span>
            </div>
          </header>

          <div class="player-session-card__divider"></div>
          <section class="player-session-info-list" aria-label="Informazioni sessione">
            <div class="player-session-info-row">
              <div class="player-session-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M7 3h10a2 2 0 0 1 2 2v15.2a.8.8 0 0 1-1.23.67L12 17.18l-5.77 3.69A.8.8 0 0 1 5 20.2V5a2 2 0 0 1 2-2Zm0 2v12.83l4.46-2.85a1 1 0 0 1 1.08 0L17 17.83V5H7Z"
                  />
                </svg>
              </div>
              <div class="player-session-info-content">
                <p class="player-session-info-label">SESSIONE</p>
                <p class="player-session-info-value">#{{ session.sessionNumber }}</p>
              </div>
            </div>

            <div class="player-session-info-row">
              <div class="player-session-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 8H5v9h14v-9ZM5 8h14V6H5v2Z"
                  />
                </svg>
              </div>
              <div class="player-session-info-content">
                <p class="player-session-info-label">DATA PIANIFICATA</p>
                <p class="player-session-info-value">
                  {{ formattedSessionDate }}<br />
                  <span v-if="formattedSessionTime">alle {{ formattedSessionTime }}</span>
                  <span v-else>Orario non impostato</span>
                </p>
              </div>
            </div>
            <div v-if="session.notes" class="player-session-info-row">
              <div class="player-session-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V7h3.5L13 3.5ZM7 11a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H7Zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H7Z"
                  />
                </svg>
              </div>
              <div class="player-session-info-content">
                <p class="player-session-info-label">DESCRIZIONE</p>
                <p class="player-session-description">{{ session.notes }}</p>
              </div>
            </div>
          </section>

          <p v-if="sessionClosed" class="status-message player-session-closed-message">
            Sessione chiusa: non è possibile aggiungere o modificare contenuti.
          </p>
        </article>
        <nav v-if="!isMobile" class="dm-tabs">
          <button class="dm-tab" :class="{ active: activeTab === 'events' }" @click="activeTab = 'events'">Eventi</button>
          <button class="dm-tab" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
            Chat
            <span v-if="unreadChat" class="tab-unread-badge">{{ formatUnreadBadge(unreadChat) }}</span>
          </button>
          <button class="dm-tab" :class="{ active: activeTab === 'whispers' }" @click="activeTab = 'whispers'">
            Sussurri
            <span v-if="unreadWhispers" class="tab-unread-badge">{{ formatUnreadBadge(unreadWhispers) }}</span>
          </button>
          <button class="dm-tab" :class="{ active: activeTab === 'resources' }" @click="activeTab = 'resources'">Risorse</button>
          <button class="dm-tab" :class="{ active: activeTab === 'sheet' }" @click="activeTab = 'sheet'">Scheda</button>
        </nav>

        <section v-if="activeTab === 'events'" class="dm-tab-panel stack">
          <SessionEventsPanel
            :events="events"
            :loading="loadingEvents"
            :error="eventsError"
            :can-manage="false"
            :form="eventForm"
            :form-error="eventFormError"
            :submitting="submittingEvent"
            :editing-event-id="editingEventId"
            @refresh="loadEvents"
          />
        </section>

        <section v-else-if="activeTab === 'chat'" class="dm-tab-panel">
          <SessionChatPanel
            ref="chatPanelRef"
            :messages="sessionMessages"
            :loading="sessionChatLoading"
            :error="sessionChatError"
            :can-send="!sessionClosed"
            :current-user-id="currentUserId"
            :character-options="availableCharacters"
            :language-options="chatLanguageOptions"
            :sending="sessionChatSending"
            :content="sessionChatForm.content"
            :selected-character-id="sessionChatForm.senderCharacterId"
            :selected-language="sessionChatForm.language"
            empty-message="Ancora nessun messaggio."
            message-placeholder="Messaggio..."
            :render-message-content="renderPlayerChatMessage"
            :message-content-class="getPlayerChatMessageClass"
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
            :recipients="availablePrivateRecipients"
            :selected-recipient-id="selectedPrivateRecipientId"
            :messages="sessionMessages"
            :loading="sessionChatLoading"
            :error="sessionChatError"
            :can-send="!sessionClosed"
            :current-user-id="currentUserId"
            :character-options="availableCharacters"
            :language-options="chatLanguageOptions"
            :sending="sessionChatSending"
            :content="sessionChatForm.content"
            :selected-character-id="sessionChatForm.senderCharacterId"
            :selected-language="sessionChatForm.language"
            empty-recipient-message="Seleziona un contatto."
            empty-messages-message="Nessun messaggio privato con questo contatto."
            message-placeholder="Sussurra..."
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
            :can-upload="false"
            :upload-loading="uploadLoading"
            :upload-error="uploadError"
            layout="list"
            subtitle="File condivisi dal Master."
            empty-message="Nessuna risorsa condivisa."
            @refresh="loadResources"
          />
        </section>

        <section v-else-if="activeTab === 'sheet'" class="dm-tab-panel stack">
          <div v-if="currentPlayerCharacter" class="session-sheet-host">
            <SessionCharacterSheet
              :character="currentPlayerCharacter"
              type="PC"
              :is-gm="false"
              @character-updated="handleCharacterUpdated"
            />
          </div>

          <div v-else class="start-hero">
            <h3>Nessun Personaggio</h3>
            <p>Non hai un personaggio associato a questa campagna o i dati non sono caricati.</p>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
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

.session-sheet-host {
  width: 100%;
  min-width: 0;
}

.player-session-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1rem, 2vw, 1.35rem);
  border: 1px solid color-mix(in srgb, var(--app-surface-outline) 78%, transparent);
  border-radius: 1.15rem;
  background: color-mix(in srgb, var(--app-surface-elevated) 78%, var(--app-surface));
  box-shadow: 0 14px 32px color-mix(in srgb, var(--app-shadow) 30%, transparent);
}

.player-session-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.player-session-card__title-area {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
}

.player-session-card__title {
  margin: 0;
  color: var(--app-text);
  font-size: clamp(1.35rem, 3vw, 1.9rem);
  line-height: 1.08;
  overflow-wrap: anywhere;
}

.session-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-surface-outline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-accent) 10%, transparent);
  color: var(--app-text);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.28rem 0.6rem;
}

.session-status-pill.closed {
  border-color: var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 82%, transparent);
  color: var(--app-text-muted);
}

.session-status-dot {
  width: 0.46rem;
  height: 0.46rem;
  border-radius: 999px;
  background: var(--app-accent);
  box-shadow: 0 0 0.5rem color-mix(in srgb, var(--app-accent) 38%, transparent);
}

.session-status-pill.closed .session-status-dot {
  background: var(--app-text-muted);
  box-shadow: none;
}

.player-session-card__divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--app-surface-outline) 80%, transparent),
    transparent
  );
}

.player-session-info-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.player-session-info-row {
  display: grid;
  grid-template-columns: 2.45rem minmax(0, 1fr);
  gap: 0.8rem;
  align-items: start;
  padding: 0.7rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--app-surface-outline) 48%, transparent);
}

.player-session-info-row:last-child {
  border-bottom: none;
}

.player-session-info-icon {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid color-mix(in srgb, var(--app-accent) 28%, var(--app-surface-outline));
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-elevated));
  color: var(--app-accent-strong);
}

.player-session-info-icon svg {
  width: 1.05rem;
  height: 1.05rem;
  fill: currentColor;
}

.player-session-info-label {
  margin: 0 0 0.2rem;
  color: var(--app-text-muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.player-session-info-value {
  margin: 0;
  color: var(--app-text);
  font-size: clamp(1rem, 2vw, 1.15rem);
  font-weight: 750;
  line-height: 1.35;
}

.player-session-info-value span {
  color: var(--app-text-muted);
  font-weight: 650;
}

.player-session-description {
  margin: 0;
  color: var(--app-text);
  font-size: 0.98rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.player-session-closed-message {
  margin: 0;
}

@media (max-width: 768px) {
  .player-session-card {
    padding: 0.95rem;
    border-radius: 1rem;
  }

  .player-session-info-row {
    grid-template-columns: 2.25rem minmax(0, 1fr);
    gap: 0.7rem;
  }

  .player-session-info-icon {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 0.8rem;
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
