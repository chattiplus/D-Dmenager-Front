import type { PlayerCharacterResponse, SessionResourceResponse } from './api';
import type { SessionEventResponse } from './api';

export type SessionRealtimeEventType =
  | 'PLAYER_CHARACTER_UPDATED'
  | 'SESSION_RESOURCE_CREATED'
  | 'SESSION_EVENT_CREATED'
  | 'SESSION_EVENT_UPDATED'
  | 'SESSION_EVENT_DELETED';

export interface SessionRealtimeEvent<T = unknown> {
  type: SessionRealtimeEventType;
  sessionId: number;
  actorUserId?: number | null;
  occurredAt: string;
  payload: T;
}

export type PlayerCharacterUpdatedEvent = SessionRealtimeEvent<PlayerCharacterResponse>;
export type SessionResourceCreatedEvent = SessionRealtimeEvent<SessionResourceResponse>;
export type SessionEventRealtimePayload = { id: number; sessionId: number };
export type SessionEventCreatedEvent = SessionRealtimeEvent<SessionEventResponse>;
export type SessionEventUpdatedEvent = SessionRealtimeEvent<SessionEventResponse>;
export type SessionEventDeletedEvent = SessionRealtimeEvent<SessionEventRealtimePayload>;
