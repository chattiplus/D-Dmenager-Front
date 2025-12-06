// src/api/npcsApi.ts
import { httpClient } from './httpClient';
import type { CreateNpcRequest, NpcResponse, UpdateNpcRequest } from '../types/api';

export const getNpcs = async () => {
  const { data } = await httpClient.get<NpcResponse[]>('/npcs');
  return data;
};

export const getNpcById = async (npcId: number) => {
  const { data } = await httpClient.get<NpcResponse>(`/npcs/${npcId}`);
  return data;
};

export const getNpcsByWorld = async (worldId: number) => {
  const { data } = await httpClient.get<NpcResponse[]>(`/npcs/world/${worldId}`);
  return data;
};

export const createNpc = async (payload: CreateNpcRequest) => {
  const { data } = await httpClient.post<NpcResponse>('/npcs', payload);
  return data;
};

export const updateNpc = async (npcId: number, payload: UpdateNpcRequest) => {
  const { data } = await httpClient.put<NpcResponse>(`/npcs/${npcId}`, payload);
  return data;
};

export const deleteNpc = async (npcId: number) => {
  await httpClient.delete(`/npcs/${npcId}`);
};
