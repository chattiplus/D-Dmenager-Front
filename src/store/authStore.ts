// src/store/authStore.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  httpClient,
  setAuthCredentials,
  clearAuthCredentials,
  withoutAuth,
} from '../api/httpClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  role: 'PLAYER' | 'DM' | 'VIEWER';
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  roles: string[];
}

export interface WorldResponse {
  id: number;
  name: string;
  description: string | null;
  ownerId: number | null;
  ownerNickname: string | null;
  campaignCount: number;
}

export const useAuthStore = defineStore('auth', () => {
  const email = ref<string | null>(null);
  const password = ref<string | null>(null);
  const nickname = ref<string | null>(null);
  const roles = ref<string[]>([]);
  const isAuthenticated = ref(false);
  const loading = ref(false);

  const login = async (credentials: LoginRequest) => {
    loading.value = true;
    try {
      await httpClient.post<UserResponse>('/auth/login', credentials, withoutAuth());
      setAuthCredentials(credentials.email, credentials.password);
      email.value = credentials.email;
      password.value = credentials.password;

      const { data } = await httpClient.get<UserResponse>('/auth/me');
      nickname.value = data.nickname;
      roles.value = data.roles ?? [];
      isAuthenticated.value = true;
      return data;
    } catch (error) {
      logout();
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const register = async (request: RegisterRequest) => {
    await httpClient.post('/auth/register', request, withoutAuth());
  };

  const logout = () => {
    clearAuthCredentials();
    email.value = null;
    password.value = null;
    nickname.value = null;
    roles.value = [];
    isAuthenticated.value = false;
    loading.value = false;
  };

  const fetchWorlds = async () => {
    if (!isAuthenticated.value) {
      throw new Error('Autenticazione richiesta.');
    }
    const { data } = await httpClient.get<WorldResponse[]>('/worlds');
    return data;
  };

  const roleBadge = computed(() => roles.value.join(', '));

  return {
    email,
    password,
    nickname,
    roles,
    isAuthenticated,
    loading,
    roleBadge,
    login,
    register,
    logout,
    fetchWorlds,
  };
});

export type AuthStore = ReturnType<typeof useAuthStore>;
