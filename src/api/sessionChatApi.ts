// src/api/sessionChatApi.ts
import { httpClient } from './httpClient';
import type {
  SessionChatMessageRequest,
  SessionChatMessageResponse,
} from '../types/api';

export const getSessionChatMessages = async (
  sessionId: number,
  recipientUserId?: number | null,
) => {
  const params: Record<string, any> = {};
  if (recipientUserId) {
    params.recipientUserId = recipientUserId;
  }
  const { data } = await httpClient.get<SessionChatMessageResponse[]>(
    `/sessions/${sessionId}/chat/messages`,
    { params },
  );
  return data;
};

export const sendSessionChatMessage = async (
  sessionId: number,
  payload: SessionChatMessageRequest,
) => {
  const { data } = await httpClient.post<SessionChatMessageResponse>(
    `/sessions/${sessionId}/chat/messages`,
    payload,
  );
  return data;
};
