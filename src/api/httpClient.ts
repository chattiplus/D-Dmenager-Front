// src/api/httpClient.ts
import axios from 'axios';
import type { AuthStore } from '../store/authStore';

let authStore: Pick<AuthStore, 'authHeader'> | null = null;

export const registerAuthStore = (store: Pick<AuthStore, 'authHeader'>) => {
  authStore = store;
};

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
});

httpClient.interceptors.request.use((config) => {
  if (authStore?.authHeader) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = authStore.authHeader;
  }
  return config;
});
