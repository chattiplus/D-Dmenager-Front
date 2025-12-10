// src/api/charactersApi.ts
import { httpClient } from './httpClient';
import type {
  PlayerCharacterRequest,
  PlayerCharacterResponse,
} from '../types/api';

export const getMyCharacters = async () => {
  const { data } = await httpClient.get<PlayerCharacterResponse[]>('/characters/my');
  return data;
};

export const getCharacterById = async (characterId: number) => {
  const { data } = await httpClient.get<PlayerCharacterResponse>(`/characters/${characterId}`);
  return data;
};

export const createCharacter = async (payload: PlayerCharacterRequest) => {
  const { data } = await httpClient.post<PlayerCharacterResponse>('/characters', payload);
  return data;
};

export const updateCharacter = async (
  characterId: number,
  payload: PlayerCharacterRequest,
) => {
  const { data } = await httpClient.put<PlayerCharacterResponse>(`/characters/${characterId}`, payload);
  return data;
};

export const deleteCharacter = async (characterId: number) => {
  await httpClient.delete(`/characters/${characterId}`);
};
