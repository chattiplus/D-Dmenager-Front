// src/api/sessionEventsApi.ts
import { httpClient } from './httpClient';
import type {
  CreateSessionEventRequest,
  SessionEventResponse,
  UpdateSessionEventRequest,
} from '../types/api';

export const getSessionEvents = async (sessionId: number) => {
  const { data } = await httpClient.get<SessionEventResponse[]>(
    `/sessions/${sessionId}/events`,
  );
  return data;
};

export const createSessionEvent = async (payload: CreateSessionEventRequest) => {
  const { data } = await httpClient.post<SessionEventResponse>('/session-events', payload);
  return data;
};

export const updateSessionEvent = async (
  eventId: number,
  payload: UpdateSessionEventRequest,
) => {
  const { data } = await httpClient.put<SessionEventResponse>(
    `/session-events/${eventId}`,
    payload,
  );
  return data;
};

export const deleteSessionEvent = async (eventId: number) => {
  await httpClient.delete(`/session-events/${eventId}`);
};
