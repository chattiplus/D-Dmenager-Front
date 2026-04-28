
import { httpClient } from './httpClient';
import type { CreateNpcRequest, NpcResponse, UpdateNpcRequest, UpdateHitPointsRequest } from '../types/api';

export const getNpcs = async (): Promise<NpcResponse[]> => {
  const { data } = await httpClient.get<NpcResponse[]>('/npcs');
  return data;
};

export const getNpcById = async (id: number): Promise<NpcResponse> => {
  const { data } = await httpClient.get<NpcResponse>(`/npcs/${id}`);
  return data;
};

export const getNpcsByWorld = async (worldId: number): Promise<NpcResponse[]> => {
  const { data } = await httpClient.get<NpcResponse[]>(`/npcs/world/${worldId}`);
  return data;
};

export const createNpc = async (request: CreateNpcRequest): Promise<NpcResponse> => {
  const { data } = await httpClient.post<NpcResponse>('/npcs', request);
  return data;
};

export const updateNpc = async (id: number, request: UpdateNpcRequest): Promise<NpcResponse> => {
  const { data } = await httpClient.put<NpcResponse>(`/npcs/${id}`, request);
  return data;
};

export const deleteNpc = async (id: number): Promise<void> => {
  await httpClient.delete(`/npcs/${id}`);
};

export const updateNpcHp = async (id: number, currentHitPoints: number): Promise<NpcResponse> => {
  const request: UpdateHitPointsRequest = { currentHitPoints };
  const { data } = await httpClient.patch<NpcResponse>(`/npcs/${id}/hp`, request);
  return data;
};
