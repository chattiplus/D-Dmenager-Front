<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SessionChatMessageResponse } from '../../types/api';
import RefreshAction from '../ui/RefreshAction.vue';

interface RecipientOption {
  userId: number;
  nickname: string;
  characterName?: string | null;
}

interface CharacterOption {
  id: number;
  label: string;
}

const props = withDefaults(
  defineProps<{
    variant?: 'player' | 'dm';
    recipients: RecipientOption[];
    selectedRecipientId: number | null;
    messages: SessionChatMessageResponse[];
    loading: boolean;
    error: string;
    canSend: boolean;
    currentUserId: number | null;
    characterOptions: CharacterOption[];
    languageOptions: string[];
    sending: boolean;
    content: string;
    selectedCharacterId: number | null;
    selectedLanguage: string;
    title?: string;
    subtitle?: string;
    emptyRecipientMessage?: string;
    emptyMessagesMessage?: string;
    messagePlaceholder?: string;
    refreshDisabled?: boolean;
    showSenderCharacterName?: boolean;
    messageContentClass?: (message: SessionChatMessageResponse) => unknown;
  }>(),
  {
    variant: 'player',
    title: 'Sussurri',
    subtitle: '',
    emptyRecipientMessage: 'Seleziona un contatto.',
    emptyMessagesMessage: 'Nessun messaggio privato.',
    messagePlaceholder: 'Scrivi qui...',
    refreshDisabled: false,
    showSenderCharacterName: false,
    messageContentClass: undefined,
  },
);

const emit = defineEmits<{
  (event: 'update:selectedRecipientId', value: number | null): void;
  (event: 'update:content', value: string): void;
  (event: 'update:selectedCharacterId', value: number | null): void;
  (event: 'update:selectedLanguage', value: string): void;
  (event: 'refresh'): void;
  (event: 'send'): void;
}>();

const scrollContainerRef = ref<HTMLElement | null>(null);

defineExpose({
  scrollContainerRef,
});

const selectedRecipientIdModel = computed({
  get: () => props.selectedRecipientId,
  set: (value: number | null) => emit('update:selectedRecipientId', value),
});

const selectedCharacterIdModel = computed({
  get: () => props.selectedCharacterId,
  set: (value: number | null) => emit('update:selectedCharacterId', value),
});

const selectedLanguageModel = computed({
  get: () => props.selectedLanguage,
  set: (value: string) => emit('update:selectedLanguage', value),
});

const contentModel = computed({
  get: () => props.content,
  set: (value: string) => emit('update:content', value),
});

const resolveMessageContentClass = (message: SessionChatMessageResponse) =>
  props.messageContentClass ? props.messageContentClass(message) : [];
</script>

<template>
  <section class="chat-panel stack">
    <header class="panel-header">
      <div class="panel-heading">
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
      </div>
      <RefreshAction
        class="panel-refresh"
        label="Aggiorna sussurri"
        :loading="loading"
        :disabled="refreshDisabled"
        @refresh="emit('refresh')"
      />
    </header>

    <div class="chat-layout">
      <aside class="chat-sidebar card">
        <h4 class="sidebar-title">{{ variant === 'dm' ? 'Giocatori' : 'Contatti' }}</h4>
        <div class="private-list">
          <button
            v-for="recipient in recipients"
            :key="recipient.userId"
            type="button"
            class="channel-btn"
            :class="{ active: selectedRecipientId === recipient.userId }"
            @click="selectedRecipientIdModel = recipient.userId"
          >
            <template v-if="variant === 'dm'">
              <div class="user-info">
                <span class="user-name">{{ recipient.nickname }}</span>
                <span v-if="recipient.characterName" class="char-name">{{ recipient.characterName }}</span>
              </div>
            </template>
            <template v-else>
              {{ recipient.nickname }}
              <span v-if="recipient.characterName">({{ recipient.characterName }})</span>
            </template>
          </button>
          <p v-if="!recipients.length" class="muted small">
            {{ variant === 'dm' ? 'Nessun giocatore approvato.' : emptyRecipientMessage }}
          </p>
        </div>
      </aside>

      <div class="chat-main stack">
        <div v-if="!selectedRecipientId" class="empty-state muted" :class="{ 'p-1': variant === 'player' }">
          <p>{{ emptyRecipientMessage }}</p>
        </div>

        <template v-else>
          <div class="chat-feed" :class="{ loading }" ref="scrollContainerRef">
            <p v-if="loading" class="muted">Caricamento messaggi...</p>
            <p v-else-if="!messages.length" class="muted">{{ emptyMessagesMessage }}</p>
            <ul v-else class="chat-feed__list">
              <li
                v-for="message in messages"
                :key="message.id"
                class="chat-message"
                :class="{ self: message.senderUserId === currentUserId }"
              >
                <div class="chat-message__header">
                  <template v-if="variant === 'dm'">
                    <div>
                      <strong>{{ message.senderNickname }}</strong>
                      <span v-if="showSenderCharacterName && message.senderCharacterName" class="muted">
                        ({{ message.senderCharacterName }})
                      </span>
                    </div>
                    <div class="chat-message__meta">
                      <span class="pill">{{ message.language }}</span>
                      <small>{{ new Date(message.createdAt).toLocaleString() }}</small>
                    </div>
                  </template>

                  <template v-else>
                    <strong>{{ message.senderNickname }}</strong>
                  </template>
                </div>
                <p class="chat-message__content" :class="resolveMessageContentClass(message)">
                  {{ message.contentVisible }}
                </p>
              </li>
            </ul>
          </div>

          <section v-if="canSend && variant === 'dm'" class="card muted stack chat-form">
            <h4 class="card-title">Invia Sussurro</h4>
            <form class="stack" @submit.prevent="emit('send')">
              <label class="field">
                <span>Personaggio (opzionale)</span>
                <select v-model="selectedCharacterIdModel">
                  <option :value="null">Master / Narratore</option>
                  <option v-for="option in characterOptions" :key="option.id" :value="option.id">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Lingua</span>
                <select v-model="selectedLanguageModel">
                  <option v-for="language in languageOptions" :key="language" :value="language">
                    {{ language }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Messaggio</span>
                <textarea v-model="contentModel" rows="3" :placeholder="messagePlaceholder" />
              </label>
              <div class="actions">
                <button class="btn btn-primary" type="submit" :disabled="sending">
                  {{ sending ? 'Invio...' : 'Invia messaggio' }}
                </button>
              </div>
            </form>
          </section>

          <form v-else-if="canSend" class="row" @submit.prevent="emit('send')">
            <input v-model="contentModel" :placeholder="messagePlaceholder" class="flex-grow" />
            <button class="btn btn-primary" :disabled="sending">Invia</button>
          </form>
        </template>
      </div>
    </div>

    <p v-if="error" class="status-message text-danger">{{ error }}</p>
  </section>
</template>

<style scoped>
.chat-panel {
  gap: 1rem;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.panel-heading {
  flex: 1 1 auto;
  min-width: 0;
}

.panel-refresh {
  flex: 0 0 auto;
  margin-left: auto;
}

.chat-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 1rem;
  align-items: start;
}

.chat-sidebar {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  gap: 0.5rem;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.private-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.channel-btn {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s;
}

.channel-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.channel-btn.active {
  background: var(--color-primary, #6c63ff);
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.char-name {
  font-size: 0.75rem;
  opacity: 0.8;
}

.chat-main {
  gap: 1rem;
}

.chat-feed {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  min-height: 200px;
  max-height: 380px;
  overflow-y: auto;
  padding: 1rem;
}

.chat-feed.loading {
  opacity: 0.7;
}

.chat-feed__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-message {
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.chat-message.self {
  background: rgba(108, 99, 255, 0.1);
  border-color: rgba(108, 99, 255, 0.3);
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

.pill {
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
}

.row {
  display: flex;
  gap: 0.5rem;
}

.p-1 {
  padding: 1rem;
}

.flex-grow {
  flex-grow: 1;
}

@media (max-width: 768px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }

  .row {
    flex-direction: column;
  }
}
</style>
