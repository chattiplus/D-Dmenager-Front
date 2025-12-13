// src/api/sessionsApi.ts
import { httpClient } from './httpClient';
import type { CreateSessionRequest, SessionResponse } from '../types/api';

export const getSessionsByCampaign = async (campaignId: number) => {
  const { data } = await httpClient.get<SessionResponse[]>(
    `/campaigns/${campaignId}/sessions`,
  );
  return data;
};

export const createSession = async (campaignId: number, payload: CreateSessionRequest) => {
  const { data } = await httpClient.post<SessionResponse>(
    `/campaigns/${campaignId}/sessions`,
    payload,
  );
  return data;
};

export const getSessionById = async (sessionId: number) => {
  const { data } = await httpClient.get<SessionResponse>(`/sessions/${sessionId}`);
  return data;
};

export const updateSession = async (sessionId: number, payload: CreateSessionRequest) => {
  const { data } = await httpClient.put<SessionResponse>(`/sessions/${sessionId}`, payload);
  return data;
};

export const deleteSession = async (sessionId: number) => {
  await httpClient.delete(`/sessions/${sessionId}`);
};
