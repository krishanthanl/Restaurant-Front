import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, getApiErrorMessage, refreshSession } from './apiClient';
import { tokenStore } from '../features/authentication/tokenStore';

function apiError(status: number, data: unknown) {
  const error = new AxiosError('Request failed');
  Object.assign(error, { response: { status, data } });
  return error;
}

describe('getApiErrorMessage', () => {
  beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

  it('does not restore a session when logout happens during an identity-triggered refresh', async () => {
    tokenStore.setSession('old-access', 'old-csrf');
    let complete!: (value: unknown) => void;
    vi.spyOn(apiClient, 'post').mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const pending = refreshSession();
    const rejection = expect(pending).rejects.toThrow('Session changed');
    tokenStore.clear();
    complete({ data: { accessToken: 'late-access', csrfToken: 'old-csrf', user: { id: 'staff' } } });
    await rejection;
    expect(tokenStore.get()).toBeNull();
    expect(tokenStore.getCsrf()).toBeNull();
  });

  it('shares one refresh request across concurrent callers', async () => {
    tokenStore.setSession('expired', 'csrf-token');
    const response = { data: { accessToken: 'new-access', csrfToken: 'new-csrf', expiresAtUtc: '2026-10-18T00:00:00Z',
      user: { id: '1', username: 'admin', fullName: 'Admin', role: 'Admin', permissions: ['users.manage'] } } };
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return response;
    });

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(first.accessToken).toBe('new-access');
    expect(second.accessToken).toBe('new-access');
    expect(post).toHaveBeenCalledOnce();
  });

  it('describes forbidden operations without treating them as a lost session', () => {
    expect(getApiErrorMessage(apiError(403, { title: 'Access denied' })))
      .toBe('You do not have permission to perform this operation.');
  });
  it('displays server exception details with the error reference', () => {
    expect(getApiErrorMessage(apiError(500, { detail: 'Operation failed.', traceId: 'request-123' })))
      .toBe('Operation failed. (Reference: request-123)');
  });

  it('preserves business validation messages', () => {
    expect(getApiErrorMessage(apiError(400, { detail: 'Name is required.', traceId: 'request-123' })))
      .toBe('Name is required.');
  });

  it('preserves backend explanations for forbidden user-management writes', () => {
    expect(getApiErrorMessage(apiError(403, { detail: 'You cannot change your own permissions.' })))
      .toBe('You cannot change your own permissions.');
  });

  it('prefers field validation messages', () => {
    expect(getApiErrorMessage(apiError(400, { title: 'Validation failed', errors: { name: ['Enter a name.'] } })))
      .toBe('Enter a name.');
  });

  it('handles network failures without a problem response', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'))).toBe('Could not connect to the server.');
  });
});
