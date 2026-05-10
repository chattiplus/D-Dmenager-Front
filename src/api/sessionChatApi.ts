// src/api/sessionChatApi.ts
import { httpClient } from './httpClient';
import type {
  SessionChatMessageRequest,
  SessionChatMessageResponse,
} from '../types/api';

interface SessionChatMessagesOptions {
  recipientUserId?: number | null;
  privateOnly?: boolean;
}

export const getSessionChatMessages = async (
  sessionId: number,
  options: SessionChatMessagesOptions = {},
) => {
  const params: Record<string, any> = {};
  if (options.recipientUserId) {
    params.recipientUserId = options.recipientUserId;
  }
  if (options.privateOnly) {
    params.privateOnly = true;
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
