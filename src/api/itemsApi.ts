// src/api/itemsApi.ts
import { httpClient } from './httpClient';
import type { CreateItemRequest, ItemResponse, UpdateItemRequest } from '../types/api';

export const getItems = async () => {
  const { data } = await httpClient.get<ItemResponse[]>('/items');
  return data;
};

export const getItemById = async (itemId: number) => {
  const { data } = await httpClient.get<ItemResponse>(`/items/${itemId}`);
  return data;
};

export const getItemsByWorld = async (worldId: number) => {
  const { data } = await httpClient.get<ItemResponse[]>(`/items/world/${worldId}`);
  return data;
};

export const createItem = async (payload: CreateItemRequest) => {
  const { data } = await httpClient.post<ItemResponse>('/items', payload);
  return data;
};

export const updateItem = async (itemId: number, payload: UpdateItemRequest) => {
  const { data } = await httpClient.put<ItemResponse>(`/items/${itemId}`, payload);
  return data;
};

export const deleteItem = async (itemId: number) => {
  await httpClient.delete(`/items/${itemId}`);
};
