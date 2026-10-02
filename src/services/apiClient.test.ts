import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { apiClient } from './apiClient';
import { tokenStore } from '../features/authentication/tokenStore';

const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => sessionStorage.clear());
afterEach(() => { apiClient.defaults.adapter = originalAdapter; vi.restoreAllMocks(); });

describe('Authentication interceptors', () => {
  it('attaches tokens centrally and omits them after logout and during login', async () => {
    const headers: unknown[] = [];
    const adapter: AxiosAdapter = async (config) => {
      headers.push(config.headers.Authorization);
      return { data: {}, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
    };
    apiClient.defaults.adapter = adapter;
    tokenStore.set('token-one');
    await apiClient.get('/menu-items');
    await apiClient.post('/auth/login');
    tokenStore.clear();
    await apiClient.get('/menu-items');
    expect(headers).toEqual(['Bearer token-one', undefined, undefined]);
  });

  it('clears only the session whose authenticated request returned 401', async () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined,
        { data: {}, status: 401, statusText: 'Unauthorized', headers: new AxiosHeaders(), config });
    };
    tokenStore.set('current');
    await expect(apiClient.post('/auth/login')).rejects.toThrow();
    expect(tokenStore.get()).toBe('current');
    expect(dispatch).not.toHaveBeenCalled();
    await expect(apiClient.get('/auth/me')).rejects.toThrow();
    expect(tokenStore.get()).toBeNull();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('ignores a late 401 from a previous session', async () => {
    tokenStore.set('old');
    apiClient.defaults.adapter = async (config) => {
      tokenStore.set('new');
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined,
        { data: {}, status: 401, statusText: 'Unauthorized', headers: new AxiosHeaders(), config });
    };
    await expect(apiClient.get('/menu-items')).rejects.toThrow();
    expect(tokenStore.get()).toBe('new');
  });
});
