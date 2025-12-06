// src/api/locationsApi.ts
import { httpClient } from './httpClient';
import type {
  CreateLocationRequest,
  LocationResponse,
  UpdateLocationRequest,
} from '../types/api';

export const getLocations = async () => {
  const { data } = await httpClient.get<LocationResponse[]>('/locations');
  return data;
};

export const getLocationById = async (locationId: number) => {
  const { data } = await httpClient.get<LocationResponse>(`/locations/${locationId}`);
  return data;
};

export const getLocationsByWorld = async (worldId: number) => {
  const { data } = await httpClient.get<LocationResponse[]>(`/locations/world/${worldId}`);
  return data;
};

export const createLocation = async (payload: CreateLocationRequest) => {
  const { data } = await httpClient.post<LocationResponse>('/locations', payload);
  return data;
};

export const updateLocation = async (
  locationId: number,
  payload: UpdateLocationRequest,
) => {
  const { data } = await httpClient.put<LocationResponse>(`/locations/${locationId}`, payload);
  return data;
};

export const deleteLocation = async (locationId: number) => {
  await httpClient.delete(`/locations/${locationId}`);
};
