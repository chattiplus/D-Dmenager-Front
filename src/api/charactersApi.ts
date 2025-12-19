
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { PlayerCharacterRequest, PlayerCharacterResponse, UpdateHitPointsRequest, UpdateDeathSavesRequest, UpdateInventoryRequest, UpdateSpellSlotsRequest } from '../types/api';

const API_Base_URL = 'http://localhost:8080/api/characters';

const getHeaders = () => {
  const authStore = useAuthStore();
  return {
    Authorization: `Bearer ${authStore.accessToken}`,
  };
};

export const createCharacter = async (character: PlayerCharacterRequest): Promise<PlayerCharacterResponse> => {
  const response = await axios.post(API_Base_URL, character, { headers: getHeaders() });
  return response.data;
};

export const getMyCharacters = async (): Promise<PlayerCharacterResponse[]> => {
  const response = await axios.get(`${API_Base_URL}/my`, { headers: getHeaders() });
  return response.data;
};

export const getCharacterById = async (id: number): Promise<PlayerCharacterResponse> => {
  const response = await axios.get(`${API_Base_URL}/${id}`, { headers: getHeaders() });
  return response.data;
};

export const getCharactersByWorld = async (worldId: number): Promise<PlayerCharacterResponse[]> => {
  const response = await axios.get(`${API_Base_URL}/world/${worldId}`, { headers: getHeaders() });
  return response.data;
};

export const updateCharacter = async (id: number, character: PlayerCharacterRequest): Promise<PlayerCharacterResponse> => {
  const response = await axios.put(`${API_Base_URL}/${id}`, character, { headers: getHeaders() });
  return response.data;
};

export const deleteCharacter = async (id: number): Promise<void> => {
  await axios.delete(`${API_Base_URL}/${id}`, { headers: getHeaders() });
};

export const updateCharacterHp = async (id: number, currentHitPoints: number): Promise<PlayerCharacterResponse> => {
  const request: UpdateHitPointsRequest = { currentHitPoints };
  const response = await axios.patch(`${API_Base_URL}/${id}/hp`, request, { headers: getHeaders() });
  return response.data;
};

export const updateCharacterDeathSaves = async (id: number, successes: number, failures: number): Promise<PlayerCharacterResponse> => {
  const request: UpdateDeathSavesRequest = { successes, failures };
  const response = await axios.patch(`${API_Base_URL}/${id}/death-saves`, request, { headers: getHeaders() });
  return response.data;
};


export const updateCharacterInventory = async (id: number, equipment: string, treasure: string): Promise<PlayerCharacterResponse> => {
  const request: UpdateInventoryRequest = { equipment, treasure };
  const response = await axios.patch(`${API_Base_URL}/${id}/inventory`, request, { headers: getHeaders() });
  return response.data;
};

export const updateCharacterSpellSlots = async (id: number, spellSlots: string): Promise<PlayerCharacterResponse> => {
  const request: UpdateSpellSlotsRequest = { spellSlots };
  const response = await axios.patch(`${API_Base_URL}/${id}/spell-slots`, request, { headers: getHeaders() });
  return response.data;
};

export const performLongRest = async (id: number): Promise<PlayerCharacterResponse> => {
  const response = await axios.post(`${API_Base_URL}/${id}/long-rest`, {}, { headers: getHeaders() });
  return response.data;
};




