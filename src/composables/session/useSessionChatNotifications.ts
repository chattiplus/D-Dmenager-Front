import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import type { SessionChatMessageResponse } from '../../types/api';
import { realtimeService } from '../../services/realtimeService';

interface UseSessionChatNotificationsOptions {
  sessionId: Ref<number | null>;
  activeTab: Ref<string>;
  currentUserId: Ref<number | null>;
}

const parseSessionChatMessage = (body: string): SessionChatMessageResponse | null => {
  try {
    const parsed = JSON.parse(body) as SessionChatMessageResponse;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const useSessionChatNotifications = ({
  sessionId,
  activeTab,
  currentUserId,
}: UseSessionChatNotificationsOptions) => {
  const unreadWhispers = ref(0);
  const unreadChat = ref(0);

  let realtimeUnsubscribe: (() => void) | null = null;

  const clearWhispers = () => {
    unreadWhispers.value = 0;
  };

  const clearChat = () => {
    unreadChat.value = 0;
  };

  const resetUnread = () => {
    clearWhispers();
    clearChat();
  };

  const stopRealtimeSubscription = () => {
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
    }
  };

  const handleMessage = (message: SessionChatMessageResponse) => {
    if (!sessionId.value || message.sessionId !== sessionId.value) {
      return;
    }

    if (message.senderUserId === currentUserId.value) {
      return;
    }

    if (message.recipientUserId) {
      if (activeTab.value !== 'whispers') {
        unreadWhispers.value += 1;
      }
      return;
    }

    if (activeTab.value !== 'chat') {
      unreadChat.value += 1;
    }
  };

  const startRealtimeSubscription = async () => {
    if (!sessionId.value || realtimeUnsubscribe) {
      return;
    }

    try {
      realtimeUnsubscribe = await realtimeService.subscribe(
        `/user/queue/sessions/${sessionId.value}/chat`,
        (body) => {
          const message = parseSessionChatMessage(body);
          if (!message) {
            return;
          }

          handleMessage(message);
        },
      );
    } catch {
      realtimeUnsubscribe = null;
    }
  };

  watch(
    activeTab,
    (tab) => {
      if (tab === 'whispers') {
        clearWhispers();
      }

      if (tab === 'chat') {
        clearChat();
      }
    },
    { immediate: true },
  );

  watch(
    sessionId,
    () => {
      resetUnread();
      stopRealtimeSubscription();

      if (sessionId.value) {
        void startRealtimeSubscription();
      }
    },
    { immediate: true },
  );

  watch(currentUserId, () => {
    resetUnread();
  });

  onBeforeUnmount(() => {
    stopRealtimeSubscription();
  });

  return {
    unreadWhispers,
    unreadChat,
    clearWhispers,
    clearChat,
    resetUnread,
  };
};
