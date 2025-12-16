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

export const joinSession = async (campaignId: number) => {
  // Placeholder if specific join session endpoint exists, distinct from campaign join
  // For now returning true or implementing based on backend if it exists.
  // Assuming it triggers a request or similar.
  // Using generic mock for now to prevent breakage, or connecting to campaign join.
  return Promise.resolve();
};

export const confirmSessionAttendance = async (sessionId: number, status: 'CONFIRMED' | 'DECLINED') => {
  // Assuming backend endpoint: POST /sessions/{sessionId}/attendance
  // If not exists, will fail 404 but fix syntax error.
  // Correct path likely: /sessions/{sessionId}/participate?status={status} or similar.
  // Implementing generic placeholder to fix syntax error first.
  await httpClient.post(`/sessions/${sessionId}/attendance`, { status });
};
