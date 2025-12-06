// src/utils/errorMessage.ts
import { isAxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api';

export const extractApiErrorMessage = (
  error: unknown,
  fallbackMessage = 'Errore inatteso.',
) => {
  if (isAxiosError<ApiErrorResponse>(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.status === 0) {
      return 'Backend non raggiungibile.';
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
