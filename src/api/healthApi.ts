// src/api/healthApi.ts
import { httpClient } from './httpClient';

export const checkHealth = async () => {
  const { data } = await httpClient.get('/health');
  return data;
};
