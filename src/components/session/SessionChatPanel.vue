<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SessionChatMessageResponse } from '../../types/api';
import RefreshAction from '../ui/RefreshAction.vue';

interface CharacterOption {
  id: number;
  label: string;
}

const props = withDefaults(
  defineProps<{
    variant?: 'player' | 'dm';
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
    emptyMessage?: string;
    cannotSendMessage?: string;
    messagePlaceholder?: string;
    renderMessageContent?: (message: SessionChatMessageResponse) => string;
    messageContentClass?: (message: SessionChatMessageResponse) => unknown;
    showLanguageTag?: boolean;
    showSenderCharacterName?: boolean;
  }>(),
  {
    variant: 'player',
    title: 'Chat di sessione',
    subtitle: '',
    emptyMessage: 'Ancora nessun messaggio.',
    cannotSendMessage: 'Non hai i permessi per partecipare alla chat.',
    messagePlaceholder: 'Scrivi qui...',
    renderMessageContent: undefined,
    messageContentClass: undefined,
    showLanguageTag: true,
    showSenderCharacterName: false,
  },
);

const emit = defineEmits<{
  (event: 'refresh'): void;
  (event: 'send'): void;
  (event: 'update:content', value: string): void;
  (event: 'update:selectedCharacterId', value: number | null): void;
  (event: 'update:selectedLanguage', value: string): void;
}>();

const scrollContainerRef = ref<HTMLElement | null>(null);

defineExpose({
  scrollContainerRef,
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

const resolveMessageContent = (message: SessionChatMessageResponse) =>
  props.renderMessageContent ? props.renderMessageContent(message) : message.contentVisible;

const resolveMessageContentClass = (message: SessionChatMessageResponse) =>
  props.messageContentClass ? props.messageContentClass(message) : [];
</script>

<template>
  <section class="chat-panel stack">
    <header v-if="variant === 'dm'" class="section-header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
      </div>
      <RefreshAction
        label="Aggiorna chat"
        :loading="loading"
        @refresh="emit('refresh')"
      />
    </header>

    <RefreshAction
      v-else
      class="align-start"
      label="Aggiorna chat"
      :loading="loading"
      @refresh="emit('refresh')"
    />

    <p v-if="error" class="status-message text-danger">{{ error }}</p>

    <div class="chat-feed" :class="{ loading }" ref="scrollContainerRef">
      <p v-if="loading" class="muted">Caricamento messaggi...</p>
      <p v-else-if="!messages.length" class="muted">{{ emptyMessage }}</p>
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
                <span v-if="showLanguageTag" class="pill">{{ message.language }}</span>
                <small>{{ new Date(message.createdAt).toLocaleString() }}</small>
              </div>
            </template>

            <template v-else>
              <strong>{{ message.senderNickname }}</strong>
              <div class="chat-message__meta compact">
                <small>{{ new Date(message.createdAt).toLocaleTimeString() }}</small>
                <small v-if="showLanguageTag && message.language && message.language !== 'COMMON'" class="language-tag">
                  [{{ message.language }}]
                </small>
              </div>
            </template>
          </div>

          <p class="chat-message__content" :class="resolveMessageContentClass(message)">
            {{ resolveMessageContent(message) }}
          </p>
        </li>
      </ul>
    </div>

    <section v-if="canSend && variant === 'dm'" class="card muted stack chat-form">
      <h4 class="card-title">Invia messaggio (Globale)</h4>
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

    <form v-else-if="canSend" class="stack" @submit.prevent="emit('send')">
      <div class="row">
        <select v-model="selectedCharacterIdModel">
          <option :value="null">-- Seleziona Personaggio --</option>
          <option v-for="option in characterOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
        <select v-model="selectedLanguageModel">
          <option v-for="language in languageOptions" :key="language" :value="language">
            {{ language }}
          </option>
        </select>
      </div>
      <div class="row">
        <input v-model="contentModel" :placeholder="messagePlaceholder" class="flex-grow" />
        <button class="btn btn-primary" :disabled="sending">Invia</button>
      </div>
    </form>

    <p v-else class="muted">{{ cannotSendMessage }}</p>
  </section>
</template>

<style scoped>
.chat-panel {
  gap: 1rem;
}

.align-start {
  align-self: flex-start;
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

.chat-message__meta.compact {
  font-size: 0.75rem;
}

.chat-message__content {
  margin: 0;
  white-space: pre-wrap;
}

.row {
  display: flex;
  gap: 0.5rem;
}

.flex-grow {
  flex-grow: 1;
}

.pill {
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 768px) {
  .row {
    flex-direction: column;
  }
}
</style>
