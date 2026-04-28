<!-- src/views/SessionDetailView.vue -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../store/authStore';
import { getSessionById } from '../api/sessionsApi';
import { getCampaignById } from '../api/campaignsApi';
import { getSessionEvents } from '../api/sessionEventsApi';
import { getCampaignPlayers } from '../api/campaignPlayersApi';
import { getSessionChatMessages, sendSessionChatMessage } from '../api/sessionChatApi';
import { getSessionResources } from '../api/sessionResourcesApi';
import { getCharacterById } from '../api/charactersApi';
import SessionCharacterSheet from '../components/SessionCharacterSheet.vue';
import SessionChatPanel from '../components/session/SessionChatPanel.vue';
import SessionResourcesPanel from '../components/session/SessionResourcesPanel.vue';
import SessionWhispersPanel from '../components/session/SessionWhispersPanel.vue';
import type {
  CampaignPlayerResponse,
  PlayerCharacterResponse,
  SessionChatMessageResponse,
  SessionEventResponse,
  SessionResourceResponse,
  SessionResponse,
} from '../types/api';
import { extractApiErrorMessage } from '../utils/errorMessage';
import {
  ALL_LANGUAGES,
  getFontClass,
  scrambleText,
  sortChatMessages,
} from '../utils/sessionUi';

const route = useRoute();
const authStore = useAuthStore();
const { profile } = storeToRefs(authStore);

const sessionId = computed(() => {
  const parsed = Number(route.params.id);
  return Number.isNaN(parsed) ? null : parsed;
});

const playerSheetCharacter = ref<PlayerCharacterResponse | null>(null);
let playerSheetCharacterLoadToken = 0;

const session = ref<SessionResponse | null>(null);
const sessionError = ref('');
const sessionLoading = ref(false);
const campaignName = ref('');

const events = ref<SessionEventResponse[]>([]);
const eventsError = ref('');
const loadingEvents = ref(false);

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
const chatPanelRef = ref<any>(null);
const whispersPanelRef = ref<any>(null);
let chatInterval: ReturnType<typeof setInterval> | null = null;
const CHAT_POLL_INTERVAL = 2000;

const activeTab = ref<'events' | 'chat' | 'whispers' | 'resources' | 'sheet'>('events');
const chatMode = ref<'global' | 'private'>('global');
const privateChatRecipientId = ref<number | null>(null);

const resources = ref<SessionResourceResponse[]>([]);
const resourcesLoading = ref(false);
const resourcesError = ref('');

const currentUserId = computed(() => profile.value?.id ?? null);
const isSessionOwner = computed(
  () => session.value && profile.value && session.value.ownerId === profile.value.id,
);
const currentPlayerCharacterId = computed(() => userCampaignPlayer.value?.characterId ?? null);

const userCampaignPlayer = computed(() =>
  campaignPlayers.value.find((player) => player.playerId === currentUserId.value),
);

const currentPlayerCharacter = computed<PlayerCharacterResponse | null>(() => {
  return userCampaignPlayer.value?.characterData ?? playerSheetCharacter.value;
});

const availableCharacters = computed(() => {
  if (!userCampaignPlayer.value?.characterId) {
    return [];
  }

  return [
    {
      id: userCampaignPlayer.value.characterId,
      label: userCampaignPlayer.value.characterName ?? 'Mio Personaggio',
    },
  ];
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

const handleCharacterUpdated = (updatedCharacter: PlayerCharacterResponse) => {
  playerSheetCharacter.value = updatedCharacter;
  updateCampaignPlayerCharacterData(updatedCharacter);
};

const syncPlayerCharacterContext = async (player: CampaignPlayerResponse | undefined) => {
  const token = ++playerSheetCharacterLoadToken;

  if (!player || isSessionOwner.value) {
    playerSheetCharacter.value = null;
    return;
  }

  const characterId = player.characterId ?? null;
  chatForm.senderCharacterId = characterId;

  if (!characterId) {
    playerSheetCharacter.value = null;
    return;
  }

  if (player.characterData) {
    playerSheetCharacter.value = player.characterData;
    return;
  }

  try {
    const character = await getCharacterById(characterId);

    if (token === playerSheetCharacterLoadToken) {
      playerSheetCharacter.value = character;
    }
  } catch {
    if (token === playerSheetCharacterLoadToken) {
      playerSheetCharacter.value = null;
    }
  }
};

const refreshCurrentPlayerCharacter = async () => {
  if (isSessionOwner.value) {
    return;
  }

  const characterId = currentPlayerCharacterId.value;
  if (!characterId) {
    playerSheetCharacter.value = null;
    return;
  }

  try {
    const updatedCharacter = await getCharacterById(characterId);
    handleCharacterUpdated(updatedCharacter);
  } catch {
    // Keep the last locally known sheet instead of blanking the tab on transient refresh failures.
  }
};

const loadCampaignName = async (campaignId: number) => {
  try {
    const campaign = await getCampaignById(campaignId);
    campaignName.value = campaign.name;
  } catch {
    campaignName.value = '';
  }
};

const loadCampaignPlayers = async (campaignId: number) => {
  try {
    campaignPlayers.value = await getCampaignPlayers(campaignId);
  } catch {
    campaignPlayersError.value = 'Impossibile caricare i partecipanti.';
  }
};

const loadSession = async () => {
  if (!sessionId.value) return;

  sessionLoading.value = true;
  sessionError.value = '';

  try {
    const data = await getSessionById(sessionId.value);
    session.value = data;
    await Promise.all([loadCampaignName(data.campaignId), loadCampaignPlayers(data.campaignId)]);
  } catch (error) {
    sessionError.value = extractApiErrorMessage(error, 'Impossibile caricare la sessione.');
  } finally {
    sessionLoading.value = false;
  }
};

const loadEvents = async () => {
  if (!sessionId.value) return;

  loadingEvents.value = true;
  try {
    events.value = await getSessionEvents(sessionId.value);
  } catch {
    eventsError.value = 'Errore nel caricamento eventi.';
  } finally {
    loadingEvents.value = false;
  }
};

const getActiveChatContainer = () => {
  if (activeTab.value === 'whispers') {
    return whispersPanelRef.value?.scrollContainerRef ?? null;
  }

  return chatPanelRef.value?.scrollContainerRef ?? null;
};

const isNearBottom = (offset = 40) => {
  const element = getActiveChatContainer();
  if (!element) return true;
  return element.scrollHeight - (element.scrollTop + element.clientHeight) <= offset;
};

const scrollToBottom = (force = false) => {
  const element = getActiveChatContainer();
  if (!element || (!force && !isNearBottom())) return;

  element.scrollTop = element.scrollHeight;
  setTimeout(() => {
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, 50);
};

const fetchChatMessages = async (options: { initial?: boolean; showLoader?: boolean; forceScroll?: boolean } = {}) => {
  if (!sessionId.value) return;

  if (activeTab.value === 'chat') {
    chatMode.value = 'global';
    privateChatRecipientId.value = null;
  } else if (activeTab.value === 'whispers') {
    chatMode.value = 'private';
    if (!privateChatRecipientId.value) {
      chatMessages.value = [];
      return;
    }
  }

  const { initial = false, showLoader = false, forceScroll = false } = options;
  if (showLoader || (initial && !chatMessages.value.length)) {
    chatLoading.value = true;
  }

  try {
    const recipient = chatMode.value === 'private' ? privateChatRecipientId.value : null;
    const data = sortChatMessages(await getSessionChatMessages(sessionId.value, recipient));

    if (initial || !chatMessages.value.length) {
      chatMessages.value = data;
      lastMessageId.value = data[data.length - 1]?.id ?? null;
      await nextTick();
      scrollToBottom(true);
      return;
    }

    const lastKnownId = lastMessageId.value;
    const newMessages = lastKnownId
      ? data.filter((message) => message.id > lastKnownId)
      : data.slice(chatMessages.value.length);

    if (newMessages.length) {
      chatMessages.value = [...chatMessages.value, ...newMessages];
      lastMessageId.value = newMessages[newMessages.length - 1]?.id ?? lastMessageId.value;
      const shouldScroll = forceScroll || isNearBottom();
      await nextTick();
      if (shouldScroll) {
        scrollToBottom(true);
      }
    }
  } catch {
    chatError.value = 'Errore chat.';
  } finally {
    chatLoading.value = false;
  }
};

const sendChatMessage = async () => {
  if (!sessionId.value || !chatForm.content.trim()) return;

  chatSending.value = true;

  try {
    const payload = {
      content: chatForm.content.trim(),
      language: chatForm.language,
      senderCharacterId: chatForm.senderCharacterId ?? currentPlayerCharacterId.value ?? undefined,
      messageType: chatForm.messageType,
      recipientUserId: chatMode.value === 'private' ? privateChatRecipientId.value : null,
    };
    const message = await sendSessionChatMessage(sessionId.value, payload);

    const currentContextMatches =
      (chatMode.value === 'global' && !payload.recipientUserId) ||
      (chatMode.value === 'private' && payload.recipientUserId === privateChatRecipientId.value);

    if (currentContextMatches) {
      chatMessages.value = [...chatMessages.value, message];
      lastMessageId.value = message.id;
      await nextTick();
      scrollToBottom(true);
    }

    chatForm.content = '';
  } catch {
    chatError.value = 'Errore invio.';
  } finally {
    chatSending.value = false;
  }
};

const startChatPolling = () => {
  if (chatInterval || (activeTab.value !== 'chat' && activeTab.value !== 'whispers') || !sessionId.value) {
    return;
  }

  fetchChatMessages({ initial: !chatMessages.value.length, showLoader: true });
  chatInterval = window.setInterval(() => fetchChatMessages(), CHAT_POLL_INTERVAL);
};

const stopChatPolling = () => {
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }
};

const loadResources = async () => {
  if (!sessionId.value) return;

  resourcesLoading.value = true;
  resourcesError.value = '';

  try {
    resources.value = await getSessionResources(sessionId.value);
  } catch (error) {
    resourcesError.value = extractApiErrorMessage(error, 'Errore caricamento risorse.');
  } finally {
    resourcesLoading.value = false;
  }
};

watch(
  userCampaignPlayer,
  (player) => {
    syncPlayerCharacterContext(player);
  },
  { immediate: true },
);

watch(
  userCampaignPlayer,
  (player) => {
    if (isSessionOwner.value) return;
    chatForm.senderCharacterId = player?.characterId ?? null;
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
      chatMessages.value = [];
      chatMode.value = 'global';
      privateChatRecipientId.value = null;
      stopChatPolling();
      if (activeTab.value === 'chat' || activeTab.value === 'whispers') {
        startChatPolling();
      }
    }
  },
  { immediate: true },
);

watch([chatMode, privateChatRecipientId], () => {
  chatMessages.value = [];
  lastMessageId.value = null;
  if (activeTab.value === 'chat' || activeTab.value === 'whispers') {
    stopChatPolling();
    startChatPolling();
  }
});

watch(
  () => activeTab.value,
  (tab) => {
    chatMessages.value = [];
    lastMessageId.value = null;

    if (tab === 'chat') {
      chatMode.value = 'global';
      privateChatRecipientId.value = null;
      startChatPolling();
    } else if (tab === 'whispers') {
      chatMode.value = 'private';
      privateChatRecipientId.value = null;
      startChatPolling();
    } else if (tab === 'resources') {
      loadResources();
      stopChatPolling();
    } else if (tab === 'sheet') {
      stopChatPolling();
      refreshCurrentPlayerCharacter();
    } else {
      stopChatPolling();
    }
  },
);

onMounted(() => {
  if (activeTab.value === 'chat' || activeTab.value === 'whispers') {
    startChatPolling();
  }
  if (activeTab.value === 'resources') {
    loadResources();
  }
});

onBeforeUnmount(() => stopChatPolling());
</script>

<template>
  <div class="stack">
    <div class="card stack">
      <header class="section-header">
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

        <nav class="dm-tabs">
          <button class="dm-tab" :class="{ active: activeTab === 'events' }" @click="activeTab = 'events'">Eventi</button>
          <button class="dm-tab" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">Chat</button>
          <button class="dm-tab" :class="{ active: activeTab === 'whispers' }" @click="activeTab = 'whispers'">Sussurri</button>
          <button class="dm-tab" :class="{ active: activeTab === 'resources' }" @click="activeTab = 'resources'">Risorse</button>
          <button class="dm-tab" :class="{ active: activeTab === 'sheet' }" @click="activeTab = 'sheet'">Scheda</button>
        </nav>

        <section v-if="activeTab === 'events'" class="dm-tab-panel stack">
          <button class="btn btn-link" @click="loadEvents">Aggiorna</button>
          <ul v-if="events.length" class="manager-list">
            <li v-for="event in events" :key="event.id" class="compact-card">
              <strong>{{ event.title }}</strong>
              <small class="muted">{{ event.inGameTime }} - {{ event.type }}</small>
              <p>{{ event.description }}</p>
            </li>
          </ul>
          <p v-else class="muted">Nessun evento pubblico.</p>
          <p v-if="eventsError" class="text-danger">{{ eventsError }}</p>
        </section>

        <section v-else-if="activeTab === 'chat'" class="dm-tab-panel">
          <SessionChatPanel
            ref="chatPanelRef"
            :messages="chatMessages"
            :loading="chatLoading"
            :error="chatError"
            :can-send="true"
            :current-user-id="currentUserId"
            :character-options="availableCharacters"
            :language-options="chatLanguageOptions"
            :sending="chatSending"
            :content="chatForm.content"
            :selected-character-id="chatForm.senderCharacterId"
            :selected-language="chatForm.language"
            empty-message="Ancora nessun messaggio."
            message-placeholder="Messaggio..."
            :render-message-content="renderPlayerChatMessage"
            :message-content-class="getPlayerChatMessageClass"
            @refresh="fetchChatMessages({ showLoader: true })"
            @send="sendChatMessage"
            @update:content="chatForm.content = $event"
            @update:selected-character-id="chatForm.senderCharacterId = $event"
            @update:selected-language="chatForm.language = $event"
          />
        </section>

        <section v-else-if="activeTab === 'whispers'" class="dm-tab-panel">
          <SessionWhispersPanel
            ref="whispersPanelRef"
            :recipients="availablePrivateRecipients"
            :selected-recipient-id="privateChatRecipientId"
            :messages="chatMessages"
            :loading="chatLoading"
            :error="chatError"
            :can-send="true"
            :current-user-id="currentUserId"
            :character-options="availableCharacters"
            :language-options="chatLanguageOptions"
            :sending="chatSending"
            :content="chatForm.content"
            :selected-character-id="chatForm.senderCharacterId"
            :selected-language="chatForm.language"
            empty-recipient-message="Seleziona un contatto."
            empty-messages-message="Nessun messaggio privato con questo contatto."
            message-placeholder="Sussurra..."
            @refresh="fetchChatMessages({ showLoader: true })"
            @send="sendChatMessage"
            @update:selected-recipient-id="privateChatRecipientId = $event"
            @update:content="chatForm.content = $event"
            @update:selected-character-id="chatForm.senderCharacterId = $event"
            @update:selected-language="chatForm.language = $event"
          />
        </section>

        <section v-else-if="activeTab === 'resources'" class="dm-tab-panel">
          <SessionResourcesPanel
            :resources="resources"
            :loading="resourcesLoading"
            :error="resourcesError"
            :can-upload="false"
            :upload-loading="false"
            upload-error=""
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
