import type { PlayerCharacterResponse, SessionResourceResponse } from './api';

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
