// src/api/worldsApi.ts
import { httpClient } from './httpClient';
import type {
  CreateWorldRequest,
  UpdateWorldRequest,
  WorldResponse,
} from '../types/api';

export const getWorlds = async () => {
  const { data } = await httpClient.get<WorldResponse[]>('/worlds');
  return data;
};

export const getWorldById = async (worldId: number) => {
  const { data } = await httpClient.get<WorldResponse>(`/worlds/${worldId}`);
  return data;
};

export const createWorld = async (payload: CreateWorldRequest) => {
  const { data } = await httpClient.post<WorldResponse>('/worlds', payload);
  return data;
};

export const updateWorld = async (worldId: number, payload: UpdateWorldRequest) => {
  const { data } = await httpClient.put<WorldResponse>(`/worlds/${worldId}`, payload);
  return data;
};

export const deleteWorld = async (worldId: number) => {
  await httpClient.delete(`/worlds/${worldId}`);
};
