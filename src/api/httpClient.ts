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

let accessToken: string | null = null;

type UnauthorizedHandler = () => Promise<void> | void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

httpClient.interceptors.request.use((config) => {
  const request = config as InternalConfig;

  if (request.skipAuth) {
    return request;
  }

  if (accessToken) {
    request.headers = request.headers ?? {};
    request.headers.Authorization = `Bearer ${accessToken}`;
  }

  return request;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const request = error.config as InternalConfig | undefined;
      if (!request?.skipAuth && unauthorizedHandler) {
        await unauthorizedHandler();
      }
    }

    return Promise.reject(error);
  },
);

export const withoutAuth = (config: AuthenticatedRequestConfig = {}) => ({
  ...config,
  skipAuth: true,
});
