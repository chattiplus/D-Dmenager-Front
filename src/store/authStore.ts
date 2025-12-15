// src/store/authStore.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { setAccessToken } from '../api/httpClient';
import { getCurrentUser, login as loginApi, register as registerApi } from '../api/authApi';
import type { LoginRequest, RegisterRequest, UserResponse, UserRole } from '../types/api';

const AUTH_STORAGE_KEY = 'dd-manager-auth';

interface PersistedAuthState {
  token: string;
  profile: UserResponse;
}

const loadPersistedAuthState = (): PersistedAuthState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PersistedAuthState;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const savePersistedAuthState = (state: PersistedAuthState | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
};

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserResponse | null>(null);
  const accessToken = ref<string | null>(null);
  const isAuthenticated = ref(false);
  const loading = ref(false);

  const roles = computed<UserRole[]>(() => profile.value?.roles ?? []);
  const nickname = computed(() => profile.value?.nickname ?? null);

  const persistSession = () => {
    if (profile.value && accessToken.value) {
      savePersistedAuthState({
        token: accessToken.value,
        profile: profile.value,
      });
      return;
    }
    savePersistedAuthState(null);
  };

  const applySession = (token: string, user: UserResponse) => {
    accessToken.value = token;
    profile.value = user;
    isAuthenticated.value = true;
    setAccessToken(token);
    persistSession();
  };

  const restoreSession = () => {
    const stored = loadPersistedAuthState();
    if (stored?.token && stored?.profile) {
      accessToken.value = stored.token;
      profile.value = stored.profile;
      isAuthenticated.value = true;
      setAccessToken(stored.token);
    }
  };

  restoreSession();

  const login = async (credentials: LoginRequest) => {
    loading.value = true;
    try {
      const response = await loginApi(credentials);
      applySession(response.token, response.user);
      return profile.value;
    } catch (error) {
      logout();
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const fetchProfile = async () => {
    if (!accessToken.value) {
      throw new Error('Nessun token disponibile per aggiornare il profilo.');
    }
    const data = await getCurrentUser();
    profile.value = data;
    isAuthenticated.value = true;
    persistSession();
    return data;
  };

  const register = async (request: RegisterRequest) => {
    await registerApi(request);
  };

  const logout = () => {
    setAccessToken(null);
    accessToken.value = null;
    profile.value = null;
    isAuthenticated.value = false;
    loading.value = false;
    persistSession();
  };

  const roleBadge = computed(() => roles.value.join(', '));
  const canManageContent = computed(() =>
    roles.value.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_GM'),
  );
  const isPlayerView = computed(() =>
    roles.value.some((role) => role === 'ROLE_PLAYER' || role === 'ROLE_VIEWER'),
  );
  const isViewer = computed(() => roles.value.includes('ROLE_VIEWER'));
  const isViewerOnly = computed(
    () =>
      roles.value.includes('ROLE_VIEWER') &&
      !roles.value.some(
        (role) => role === 'ROLE_ADMIN' || role === 'ROLE_GM' || role === 'ROLE_PLAYER',
      ),
  );
  const defaultRouteName = computed(() => {
    if (canManageContent.value) {
      return 'dm-dashboard';
    }
    if (isViewerOnly.value) {
      return 'player-worlds';
    }
    return 'player-dashboard';
  });
  const defaultRoutePath = computed(() => {
    if (canManageContent.value) {
      return '/dm/dashboard';
    }
    if (isViewerOnly.value) {
      return '/player/worlds';
    }
    return '/player/dashboard';
  });

  const hasRole = (role: UserRole) => roles.value.includes(role);
  const hasAnyRole = (roleList: UserRole[]) => roleList.some((role) => hasRole(role));

  return {
    accessToken,
    profile,
    roles,
    nickname,
    isAuthenticated,
    loading,
    roleBadge,
    canManageContent,
    isPlayerView,
    defaultRouteName,
    defaultRoutePath,
    isViewer,
    isViewerOnly,
    hasRole,
    hasAnyRole,
    login,
    register,
    fetchProfile,
    logout,
  };
});

export type AuthStore = ReturnType<typeof useAuthStore>;
