// src/api/authApi.ts
import { httpClient, withoutAuth } from './httpClient';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
  UserUpdateRequest,
} from '../types/api';

export const login = async (payload: LoginRequest) => {
  const { data } = await httpClient.post<AuthResponse>('/auth/login', payload, withoutAuth());
  return data;
};

export const register = async (payload: RegisterRequest) => {
  const { data } = await httpClient.post<UserResponse>('/auth/register', payload, withoutAuth());
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await httpClient.get<UserResponse>('/auth/me');
  return data;
};

export const updateCurrentUser = async (payload: UserUpdateRequest) => {
  const { data } = await httpClient.put<UserResponse>('/auth/me', payload);
  return data;
};
