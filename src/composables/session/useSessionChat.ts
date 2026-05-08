import {
  nextTick,
  computed,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import { getSessionChatMessages, sendSessionChatMessage } from '../../api/sessionChatApi';
import type { SessionChatMessageRequest, SessionChatMessageResponse } from '../../types/api';
import { realtimeService } from '../../services/realtimeService';
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
}: UseSessionChatOptions) => {
  const allMessages = ref<SessionChatMessageResponse[]>([]);
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

  const messages = computed(() => {
    const visibleMessages =
      mode.value === 'private'
        ? allMessages.value.filter(
            (message) =>
              message.recipientUserId &&
              privateRecipientId.value &&
              (message.recipientUserId === privateRecipientId.value ||
                message.senderUserId === privateRecipientId.value),
          )
        : allMessages.value.filter((message) => !message.recipientUserId);

    return sortChatMessages(visibleMessages);
  });

  let realtimeUnsubscribe: (() => void) | null = null;
  let syncingContext = false;

  const isChatTabActive = () => CHAT_TABS.includes(activeTab.value as SessionChatTab);

  const resetChatState = () => {
    allMessages.value = [];
    error.value = '';
  };

  const mergeMessages = (incoming: SessionChatMessageResponse[]) => {
    if (!incoming.length) {
      return;
    }

    const byId = new Map(allMessages.value.map((message) => [message.id, message]));
    incoming.forEach((message) => {
      byId.set(message.id, message);
    });
    allMessages.value = sortChatMessages(Array.from(byId.values()));
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
      const shouldScroll = forceScroll || initial || isNearBottom();
      mergeMessages(data);
      error.value = '';

      await nextTick();
      if (shouldScroll) {
        scrollToBottom(true);
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
      const payload: SessionChatMessageRequest = {
        content: trimmedContent,
        language: form.language,
        senderCharacterId,
        messageType: form.messageType,
        recipientUserId: mode.value === 'private' ? privateRecipientId.value : null,
      };

      try {
        await realtimeService.publish(`/app/sessions/${sessionId.value}/chat/messages`, payload);
      } catch {
        const message = await sendSessionChatMessage(sessionId.value, payload);
        mergeMessages([message]);
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

  const stopRealtimeSubscription = () => {
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
    }
  };

  const activateRealtimeContext = async (options: ChatFetchOptions = {}) => {
    if (!isChatTabActive() || !sessionId.value) {
      return;
    }

    if (activeTab.value === 'whispers' && !privateRecipientId.value) {
      await startRealtimeSubscription();
      return;
    }

    await fetchChatMessages(options);
    await startRealtimeSubscription();
  };

  const startRealtimeSubscription = async () => {
    if (realtimeUnsubscribe || !sessionId.value || !isChatTabActive()) {
      return;
    }

    try {
      realtimeUnsubscribe = await realtimeService.subscribe(
        `/user/queue/sessions/${sessionId.value}/chat`,
        async (body) => {
          const shouldScroll = isNearBottom();
          const message = JSON.parse(body) as SessionChatMessageResponse;
          mergeMessages([message]);
          await nextTick();
          if (shouldScroll) {
            scrollToBottom(true);
          }
        },
      );
    } catch {
      error.value = loadErrorMessage;
    }
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
        void activateRealtimeContext({ initial: true, showLoader: true, forceScroll: true });
      }
    },
  );

  watch(
    activeTab,
    (tab) => {
      if (tab === 'chat' || tab === 'whispers') {
        syncContextForTab(tab);
        void activateRealtimeContext({ initial: true, showLoader: true, forceScroll: true });
        return;
      }

      stopRealtimeSubscription();
    },
  );

  watch(
    sessionId,
    () => {
      resetChatState();
      stopRealtimeSubscription();
      syncContextForTab(activeTab.value);

      if (isChatTabActive()) {
        void activateRealtimeContext({ initial: true, showLoader: true, forceScroll: true });
      }
    },
  );

  onBeforeUnmount(() => {
    stopRealtimeSubscription();
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
    startPolling: startRealtimeSubscription,
    stopPolling: stopRealtimeSubscription,
  };
};
