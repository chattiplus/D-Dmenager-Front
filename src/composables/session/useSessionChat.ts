import {
  nextTick,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import { getSessionChatMessages, sendSessionChatMessage } from '../../api/sessionChatApi';
import type { SessionChatMessageResponse } from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';
import { sortChatMessages } from '../../utils/sessionUi';

type SessionChatTab = 'chat' | 'whispers';
type ChatMode = 'global' | 'private';

interface UseSessionChatOptions {
  sessionId: Ref<number | null>;
  activeTab: Ref<string>;
  canSend: Ref<boolean> | ComputedRef<boolean>;
  currentPlayerCharacterId?: Ref<number | null> | ComputedRef<number | null>;
  getScrollContainer?: () => HTMLElement | null;
  loadErrorMessage?: string;
  sendErrorMessage?: string;
  emptyMessageError?: string;
  pollIntervalMs?: number;
}

interface ChatFetchOptions {
  initial?: boolean;
  showLoader?: boolean;
  forceScroll?: boolean;
}

const CHAT_TABS: SessionChatTab[] = ['chat', 'whispers'];

export const useSessionChat = ({
  sessionId,
  activeTab,
  canSend,
  currentPlayerCharacterId,
  getScrollContainer,
  loadErrorMessage = 'Errore chat.',
  sendErrorMessage = 'Errore invio.',
  emptyMessageError = 'Inserisci un messaggio.',
  pollIntervalMs = 2000,
}: UseSessionChatOptions) => {
  const messages = ref<SessionChatMessageResponse[]>([]);
  const lastMessageId = ref<number | null>(null);
  const error = ref('');
  const loading = ref(false);
  const sending = ref(false);
  const form = reactive({
    content: '',
    language: 'COMMON',
    senderCharacterId: null as number | null,
    messageType: 'IC',
  });
  const mode = ref<ChatMode>('global');
  const privateRecipientId = ref<number | null>(null);

  let chatInterval: ReturnType<typeof setInterval> | null = null;
  let syncingContext = false;

  const isChatTabActive = () => CHAT_TABS.includes(activeTab.value as SessionChatTab);

  const resetChatState = () => {
    messages.value = [];
    lastMessageId.value = null;
    error.value = '';
  };

  const isNearBottom = (offset = 40) => {
    const element = getScrollContainer?.() ?? null;
    if (!element) {
      return true;
    }

    return element.scrollHeight - (element.scrollTop + element.clientHeight) <= offset;
  };

  const scrollToBottom = (force = false) => {
    const element = getScrollContainer?.() ?? null;
    if (!element || (!force && !isNearBottom())) {
      return;
    }

    element.scrollTop = element.scrollHeight;
    setTimeout(() => {
      element.scrollTop = element.scrollHeight;
    }, 50);
  };

  const fetchChatMessages = async (options: ChatFetchOptions = {}) => {
    if (!sessionId.value) {
      return;
    }

    if (activeTab.value === 'chat') {
      mode.value = 'global';
      privateRecipientId.value = null;
    } else if (activeTab.value === 'whispers') {
      mode.value = 'private';
      if (!privateRecipientId.value) {
        messages.value = [];
        return;
      }
    }

    const { initial = false, showLoader = false, forceScroll = false } = options;
    if (showLoader || (initial && !messages.value.length)) {
      loading.value = true;
    }

    try {
      const recipient = mode.value === 'private' ? privateRecipientId.value : null;
      const data = sortChatMessages(await getSessionChatMessages(sessionId.value, recipient));

      if (initial || !messages.value.length) {
        messages.value = data;
        lastMessageId.value = data[data.length - 1]?.id ?? null;
        error.value = '';
        await nextTick();
        scrollToBottom(true);
        return;
      }

      const lastKnownId = lastMessageId.value;
      const newMessages = lastKnownId
        ? data.filter((message) => message.id > lastKnownId)
        : data.slice(messages.value.length);

      if (newMessages.length) {
        messages.value = [...messages.value, ...newMessages];
        lastMessageId.value = newMessages[newMessages.length - 1]?.id ?? lastMessageId.value;
        error.value = '';
        const shouldScroll = forceScroll || isNearBottom();
        await nextTick();
        if (shouldScroll) {
          scrollToBottom(true);
        }
      }
    } catch (fetchError) {
      error.value = extractApiErrorMessage(fetchError, loadErrorMessage);
    } finally {
      loading.value = false;
    }
  };

  const sendChatMessage = async () => {
    if (!sessionId.value || !canSend.value) {
      return;
    }

    const trimmedContent = form.content.trim();
    if (!trimmedContent) {
      error.value = emptyMessageError;
      return;
    }

    sending.value = true;
    error.value = '';

    try {
      const senderCharacterId =
        form.senderCharacterId ?? currentPlayerCharacterId?.value ?? undefined;
      const payload = {
        content: trimmedContent,
        language: form.language,
        senderCharacterId,
        messageType: form.messageType,
        recipientUserId: mode.value === 'private' ? privateRecipientId.value : null,
      };
      const message = await sendSessionChatMessage(sessionId.value, payload);

      const currentContextMatches =
        (mode.value === 'global' && !payload.recipientUserId) ||
        (mode.value === 'private' && payload.recipientUserId === privateRecipientId.value);

      if (currentContextMatches) {
        messages.value = [...messages.value, message];
        lastMessageId.value = message.id;
        await nextTick();
        scrollToBottom(true);
      }

      form.content = '';
    } catch (sendError) {
      error.value = extractApiErrorMessage(sendError, sendErrorMessage);
    } finally {
      sending.value = false;
    }
  };

  const stopChatPolling = () => {
    if (chatInterval) {
      clearInterval(chatInterval);
      chatInterval = null;
    }
  };

  const startChatPolling = () => {
    if (chatInterval || !sessionId.value || !isChatTabActive()) {
      return;
    }

    void fetchChatMessages({ initial: !messages.value.length, showLoader: true });
    chatInterval = window.setInterval(() => {
      void fetchChatMessages();
    }, pollIntervalMs);
  };

  const syncContextForTab = (tab: string) => {
    syncingContext = true;

    if (tab === 'chat') {
      mode.value = 'global';
      privateRecipientId.value = null;
    } else if (tab === 'whispers') {
      mode.value = 'private';
      privateRecipientId.value = null;
    } else {
      mode.value = 'global';
      privateRecipientId.value = null;
    }

    syncingContext = false;
  };

  watch(
    currentPlayerCharacterId ?? ref<number | null>(null),
    (characterId) => {
      if (currentPlayerCharacterId) {
        form.senderCharacterId = characterId ?? null;
      }
    },
    { immediate: true },
  );

  watch(
    [mode, privateRecipientId],
    () => {
      if (syncingContext) {
        return;
      }

      resetChatState();
      if (isChatTabActive()) {
        stopChatPolling();
        startChatPolling();
      }
    },
  );

  watch(
    activeTab,
    (tab) => {
      if (tab === 'chat' || tab === 'whispers') {
        syncContextForTab(tab);
        resetChatState();
        stopChatPolling();
        startChatPolling();
        return;
      }

      stopChatPolling();
    },
  );

  watch(
    sessionId,
    () => {
      resetChatState();
      stopChatPolling();
      syncContextForTab(activeTab.value);

      if (isChatTabActive()) {
        startChatPolling();
      }
    },
  );

  onBeforeUnmount(() => {
    stopChatPolling();
  });

  return {
    messages,
    loading,
    error,
    sending,
    form,
    mode,
    privateRecipientId,
    fetch: fetchChatMessages,
    send: sendChatMessage,
    startPolling: startChatPolling,
    stopPolling: stopChatPolling,
  };
};
