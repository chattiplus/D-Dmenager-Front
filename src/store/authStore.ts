// src/store/authStore.ts
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { httpClient } from '../api/httpClient';

export const useAuthStore = defineStore('auth', () => {
  const username = ref('');
  const password = ref('');
  const loading = ref(false);
  const lastResponse = ref<unknown>(null);
  const lastError = ref<string | null>(null);

  const hasCredentials = computed(
    () => username.value.trim().length > 0 && password.value.length > 0,
  );

  const authHeader = computed(() => {
    if (!hasCredentials.value) {
      return '';
    }
    const encoded = btoa(`${username.value}:${password.value}`);
    return `Basic ${encoded}`;
  });

  const setCredentials = (user: string, pass: string) => {
    username.value = user.trim();
    password.value = pass;
  };

  const clearCredentials = () => {
    username.value = '';
    password.value = '';
    lastResponse.value = null;
    lastError.value = null;
  };

  const fetchWorldsPreview = async () => {
    if (!hasCredentials.value) {
      throw new Error('Imposta prime le credenziali (username e password).');
    }

    loading.value = true;
    lastError.value = null;

    try {
      const { data } = await httpClient.get('/worlds');
      lastResponse.value = data;
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Errore sconosciuto dal server';
      lastError.value = message;
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    username,
    password,
    loading,
    lastResponse,
    lastError,
    hasCredentials,
    authHeader,
    setCredentials,
    clearCredentials,
    fetchWorldsPreview,
  };
});

export type AuthStore = ReturnType<typeof useAuthStore>;
