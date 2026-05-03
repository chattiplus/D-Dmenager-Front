import { onBeforeUnmount, watch, type ComputedRef, type Ref } from 'vue';
import { realtimeService } from '../../services/realtimeService';
import type {
  PlayerCharacterResponse,
  SessionEventResponse,
  SessionResourceResponse,
} from '../../types/api';
import type {
  SessionEventRealtimePayload,
  SessionRealtimeEvent,
} from '../../types/realtime';

interface UseSessionRealtimeEventsOptions {
  sessionId: Ref<number | null> | ComputedRef<number | null>;
  onPlayerCharacterUpdated?: (character: PlayerCharacterResponse) => void;
  onSessionResourceCreated?: (resource: SessionResourceResponse) => void;
  onSessionEventCreated?: (event: SessionEventResponse) => void;
  onSessionEventUpdated?: (event: SessionEventResponse) => void;
  onSessionEventDeleted?: (payload: SessionEventRealtimePayload) => void;
}

const isSessionRealtimeEvent = (value: unknown): value is SessionRealtimeEvent => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Record<string, unknown>;
  return typeof event.type === 'string'
    && typeof event.sessionId === 'number'
    && typeof event.occurredAt === 'string'
    && 'payload' in event;
};

export const useSessionRealtimeEvents = ({
  sessionId,
  onPlayerCharacterUpdated,
  onSessionResourceCreated,
  onSessionEventCreated,
  onSessionEventUpdated,
  onSessionEventDeleted,
}: UseSessionRealtimeEventsOptions) => {
  let realtimeUnsubscribe: (() => void) | null = null;
  let subscriptionToken = 0;

  const stopRealtimeSubscription = () => {
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
    }
  };

  const handleEventBody = (body: string) => {
    try {
      const parsed = JSON.parse(body) as unknown;
      if (!isSessionRealtimeEvent(parsed)) {
        return;
      }

      switch (parsed.type) {
        case 'PLAYER_CHARACTER_UPDATED':
          onPlayerCharacterUpdated?.(parsed.payload as PlayerCharacterResponse);
          break;
        case 'SESSION_RESOURCE_CREATED':
          onSessionResourceCreated?.(parsed.payload as SessionResourceResponse);
          break;
        case 'SESSION_EVENT_CREATED':
          onSessionEventCreated?.(parsed.payload as SessionEventResponse);
          break;
        case 'SESSION_EVENT_UPDATED':
          onSessionEventUpdated?.(parsed.payload as SessionEventResponse);
          break;
        case 'SESSION_EVENT_DELETED':
          onSessionEventDeleted?.(parsed.payload as SessionEventRealtimePayload);
          break;
        default:
          break;
      }
    } catch (error) {
      console.warn('Ignoring invalid session realtime event payload.', error);
    }
  };

  const startRealtimeSubscription = async (currentSessionId: number, token: number) => {
    try {
      const unsubscribe = await realtimeService.subscribe(
        `/topic/sessions/${currentSessionId}/events`,
        handleEventBody,
      );

      if (token !== subscriptionToken) {
        unsubscribe();
        return;
      }

      realtimeUnsubscribe = unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to session realtime events.', error);
    }
  };

  watch(
    sessionId,
    (currentSessionId) => {
      subscriptionToken += 1;
      const currentToken = subscriptionToken;
      stopRealtimeSubscription();

      if (!currentSessionId) {
        return;
      }

      void startRealtimeSubscription(currentSessionId, currentToken);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    subscriptionToken += 1;
    stopRealtimeSubscription();
  });
};
