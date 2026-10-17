import { tokenStore } from '../features/authentication/tokenStore';
import type { LoginResponse } from '../features/authentication/authTypes';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export interface ApiProblem {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
  exceptionType?: string;
  exceptionDetails?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

type RetryableConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
  withCredentials: true,
});

let refreshPromise: Promise<LoginResponse> | null = null;

async function performRefresh(): Promise<LoginResponse> {
  const csrfToken = tokenStore.getCsrf();
  if (!csrfToken) throw new Error('No refresh session is available.');
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/refresh', null, { headers: { 'X-CSRF-Token': csrfToken } });
    tokenStore.setSession(data.accessToken, data.csrfToken);
    window.dispatchEvent(new CustomEvent('auth:session-refreshed', { detail: data.user }));
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      const { data } = await apiClient.post<LoginResponse>('/auth/refresh', null, { headers: { 'X-CSRF-Token': csrfToken } });
      tokenStore.setSession(data.accessToken, data.csrfToken);
      window.dispatchEvent(new CustomEvent('auth:session-refreshed', { detail: data.user }));
      return data;
    }
    throw error;
  }
}

export function refreshSession(): Promise<LoginResponse> {
  refreshPromise ??= performRefresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function logoutSession(): Promise<void> {
  const csrfToken = tokenStore.getCsrf();
  try {
    if (csrfToken) await apiClient.post('/auth/logout', null, { headers: { 'X-CSRF-Token': csrfToken } });
  } finally { tokenStore.clear(); }
}

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStore.get();
  const isSessionEndpoint = config.url === '/auth/login' || config.url === '/auth/refresh';
  if (accessToken && !isSessionEndpoint) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const sessionEndpoint = config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && config && !config._authRetry && !sessionEndpoint && tokenStore.getCsrf()) {
      config._authRetry = true;
      try {
        const session = await refreshSession();
        config.headers.Authorization = `Bearer ${session.accessToken}`;
        return apiClient.request(config);
      } catch { /* handled below */ }
    }
    if (error.response?.status === 401 && !sessionEndpoint) {
      tokenStore.clear();
      window.sessionStorage.setItem('auth_notice', 'Your session expired. Please sign in again.');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiProblem>(error)) {
    if (error.response?.status === 403) return 'You do not have permission to perform this operation.';
    const problem = error.response?.data;
    const validationMessage = problem?.errors && Object.values(problem.errors).flat()[0];
    const message = validationMessage ?? problem?.detail ?? problem?.title ?? (error.code === 'ECONNABORTED' ? 'The request timed out.' : 'Could not connect to the server.');
    return error.response && error.response.status >= 500 && problem?.traceId
      ? `${message} (Reference: ${problem.traceId})`
      : message;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
