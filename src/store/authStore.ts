// src/store/authStore.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { clearAuthCredentials, setAuthCredentials } from '../api/httpClient';
import { getCurrentUser, login as loginApi, register as registerApi } from '../api/authApi';
import type {
  LoginRequest,
  RegisterRequest,
  UserResponse,
  UserRole,
} from '../types/api';

export const useAuthStore = defineStore('auth', () => {
  const email = ref<string | null>(null);
  const password = ref<string | null>(null);
  const profile = ref<UserResponse | null>(null);
  const isAuthenticated = ref(false);
  const loading = ref(false);

  const roles = computed<UserRole[]>(() => profile.value?.roles ?? []);
  const nickname = computed(() => profile.value?.nickname ?? null);

  const login = async (credentials: LoginRequest) => {
    loading.value = true;
    try {
      await loginApi(credentials);
      setAuthCredentials(credentials.email, credentials.password);
      email.value = credentials.email;
      password.value = credentials.password;
      await fetchProfile();
      return profile.value;
    } catch (error) {
      logout();
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const fetchProfile = async () => {
    const data = await getCurrentUser();
    profile.value = data;
    isAuthenticated.value = true;
    return data;
  };

  const register = async (request: RegisterRequest) => {
    await registerApi(request);
  };

  const logout = () => {
    clearAuthCredentials();
    email.value = null;
    password.value = null;
    profile.value = null;
    isAuthenticated.value = false;
    loading.value = false;
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
    email,
    password,
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
