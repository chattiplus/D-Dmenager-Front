<!-- src/views/SessionDetailView.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../store/authStore';
import MobileTopBar from '../components/mobile/MobileTopBar.vue';
import SessionCharacterSheet from '../components/SessionCharacterSheet.vue';
import SessionChatPanel from '../components/session/SessionChatPanel.vue';
import SessionEventsPanel from '../components/session/SessionEventsPanel.vue';
import SessionResourcesPanel from '../components/session/SessionResourcesPanel.vue';
import SessionWhispersPanel from '../components/session/SessionWhispersPanel.vue';
import { useSessionBase } from '../composables/session/useSessionBase';
import { useSessionChat } from '../composables/session/useSessionChat';
import { useSessionEvents } from '../composables/session/useSessionEvents';
import { usePlayerSessionCharacter } from '../composables/session/usePlayerSessionCharacter';
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
  canSend: computed(() => true),
  currentPlayerCharacterId,
  getScrollContainer: getActiveChatContainer,
  loadErrorMessage: 'Errore chat.',
  sendErrorMessage: 'Errore invio.',
  emptyMessageError: 'Inserisci un messaggio.',
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
    <div class="card stack">
      <MobileTopBar
        v-if="isMobile && session"
        :title="session.title"
        :subtitle="campaignName || 'Sessione'"
        :back-to="{ name: 'campaign-detail', params: { id: session.campaignId } }"
      />

      <header v-if="!isMobile" class="section-header">
        <div>
          <h1 class="section-title">Dettaglio Sessione</h1>
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
        <div class="session-info compact-card">
          <h2 class="card-title">{{ session.title }}</h2>
          <p>Sessione #{{ session.sessionNumber }}</p>
          <p v-if="session.sessionDate">Data: {{ new Date(session.sessionDate).toLocaleDateString() }}</p>
          <p class="muted">{{ session.notes }}</p>
        </div>

        <nav v-if="!isMobile" class="dm-tabs">
          <button class="dm-tab" :class="{ active: activeTab === 'events' }" @click="activeTab = 'events'">Eventi</button>
          <button class="dm-tab" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">Chat</button>
          <button class="dm-tab" :class="{ active: activeTab === 'whispers' }" @click="activeTab = 'whispers'">Sussurri</button>
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
            :can-send="true"
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
            :can-send="true"
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
          <div v-if="currentPlayerCharacter">
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
