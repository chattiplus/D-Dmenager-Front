
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { CreateNpcRequest, NpcResponse, UpdateNpcRequest, UpdateHitPointsRequest } from '../types/api';

const API_Base_URL = 'http://localhost:8080/api/npcs';

const getHeaders = () => {
  const authStore = useAuthStore();
  return {
    Authorization: `Bearer ${authStore.accessToken}`,
  };
};

export const getNpcs = async (): Promise<NpcResponse[]> => {
  const response = await axios.get(API_Base_URL, { headers: getHeaders() });
  return response.data;
};

export const getNpcById = async (id: number): Promise<NpcResponse> => {
  const response = await axios.get(`${API_Base_URL}/${id}`, { headers: getHeaders() });
  return response.data;
};

export const getNpcsByWorld = async (worldId: number): Promise<NpcResponse[]> => {
  const response = await axios.get(`${API_Base_URL}/world/${worldId}`, { headers: getHeaders() });
  return response.data;
};

export const createNpc = async (request: CreateNpcRequest): Promise<NpcResponse> => {
  const response = await axios.post(API_Base_URL, request, { headers: getHeaders() });
  return response.data;
};

export const updateNpc = async (id: number, request: UpdateNpcRequest): Promise<NpcResponse> => {
  const response = await axios.put(`${API_Base_URL}/${id}`, request, { headers: getHeaders() });
  return response.data;
};

export const deleteNpc = async (id: number): Promise<void> => {
  await axios.delete(`${API_Base_URL}/${id}`, { headers: getHeaders() });
};

export const updateNpcHp = async (id: number, currentHitPoints: number): Promise<NpcResponse> => {
  const request: UpdateHitPointsRequest = { currentHitPoints };
  const response = await axios.patch(`${API_Base_URL}/${id}/hp`, request, { headers: getHeaders() });
  return response.data;
};
