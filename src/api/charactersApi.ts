import { httpClient } from './httpClient';

import type {
  PlayerCharacterRequest,
  PlayerCharacterResponse,
  UpdateDeathSavesRequest,
  UpdateHitPointsRequest,
  UpdateInventoryRequest,
  UpdateSpellSlotsRequest,
} from '../types/api';

export const createCharacter = async (
    character: PlayerCharacterRequest,
): Promise<PlayerCharacterResponse> => {
  const { data } = await httpClient.post<PlayerCharacterResponse>(
      '/characters',
      character,
  );

  return data;
};

export const getMyCharacters = async (): Promise<PlayerCharacterResponse[]> => {
  const { data } = await httpClient.get<PlayerCharacterResponse[]>(
      '/characters/my',
  );

  return data;
};

export const getCharacterById = async (
    id: number,
): Promise<PlayerCharacterResponse> => {
  const { data } = await httpClient.get<PlayerCharacterResponse>(
      `/characters/${id}`,
  );

  return data;
};

export const getCharactersByWorld = async (
    worldId: number,
): Promise<PlayerCharacterResponse[]> => {
  const { data } = await httpClient.get<PlayerCharacterResponse[]>(
      `/characters/world/${worldId}`,
  );

  return data;
};

export const updateCharacter = async (
    id: number,
    character: PlayerCharacterRequest,
): Promise<PlayerCharacterResponse> => {
  const { data } = await httpClient.put<PlayerCharacterResponse>(
      `/characters/${id}`,
      character,
  );

  return data;
};

export const deleteCharacter = async (id: number): Promise<void> => {
  await httpClient.delete(`/characters/${id}`);
};

export const updateCharacterHp = async (
    id: number,
    currentHitPoints: number,
): Promise<PlayerCharacterResponse> => {
  const request: UpdateHitPointsRequest = {
    currentHitPoints,
  };

  const { data } = await httpClient.patch<PlayerCharacterResponse>(
      `/characters/${id}/hp`,
      request,
  );

  return data;
};

export const updateCharacterDeathSaves = async (
    id: number,
    successes: number,
    failures: number,
): Promise<PlayerCharacterResponse> => {
  const request: UpdateDeathSavesRequest = {
    successes,
    failures,
  };

  const { data } = await httpClient.patch<PlayerCharacterResponse>(
      `/characters/${id}/death-saves`,
      request,
  );

  return data;
};

export const updateCharacterInventory = async (
    id: number,
    equipment: string,
    treasure: string,
): Promise<PlayerCharacterResponse> => {
  const request: UpdateInventoryRequest = {
    equipment,
    treasure,
  };

  const { data } = await httpClient.patch<PlayerCharacterResponse>(
      `/characters/${id}/inventory`,
      request,
  );

  return data;
};

export const updateCharacterSpellSlots = async (
    id: number,
    spellSlots: string,
): Promise<PlayerCharacterResponse> => {
  const request: UpdateSpellSlotsRequest = {
    spellSlots,
  };

  const { data } = await httpClient.patch<PlayerCharacterResponse>(
      `/characters/${id}/spell-slots`,
      request,
  );

  return data;
};

export const performLongRest = async (
    id: number,
): Promise<PlayerCharacterResponse> => {
  const { data } = await httpClient.post<PlayerCharacterResponse>(
      `/characters/${id}/long-rest`,
      {},
  );

  return data;
};