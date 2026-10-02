import { tokenStore } from '../features/authentication/tokenStore';
import axios, { AxiosError } from 'axios';

export interface ApiProblem {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStore.get();
  if (accessToken && config.url !== '/auth/login') config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const sentToken = error.config?.headers.Authorization;
    if (error.response?.status === 401 && sentToken && sentToken === `Bearer ${tokenStore.get()}`) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiProblem>(error)) {
    const problem = error.response?.data;
    const validationMessage = problem?.errors && Object.values(problem.errors).flat()[0];
    return validationMessage ?? problem?.detail ?? problem?.title ?? (error.code === 'ECONNABORTED' ? 'The request timed out.' : 'Could not connect to the server.');
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
