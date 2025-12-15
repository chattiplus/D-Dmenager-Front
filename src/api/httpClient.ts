// src/api/httpClient.ts
import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

export interface AuthenticatedRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}

type InternalConfig = InternalAxiosRequestConfig & {
  skipAuth?: boolean;
};

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const sanitizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const httpClient = axios.create({
  baseURL: `${sanitizedBaseUrl}/api`,
});

let authEmail: string | null = null;
let authPassword: string | null = null;

export const setAuthCredentials = (email: string | null, password: string | null) => {
  authEmail = email?.trim() || null;
  authPassword = password ?? null;
};

export const clearAuthCredentials = () => {
  authEmail = null;
  authPassword = null;
};

httpClient.interceptors.request.use((config) => {
  const request = config as InternalConfig;

  if (request.skipAuth) {
    delete request.skipAuth;
    return request;
  }

  if (authEmail && authPassword) {
    const encoded = btoa(`${authEmail}:${authPassword}`);
    request.headers = request.headers ?? {};
    request.headers.Authorization = `Basic ${encoded}`;
  }

  return request;
});

export const withoutAuth = (config: AuthenticatedRequestConfig = {}) => ({
  ...config,
  skipAuth: true,
});
