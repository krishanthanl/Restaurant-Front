import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './apiClient';

function apiError(status: number, data: unknown) {
  const error = new AxiosError('Request failed');
  Object.assign(error, { response: { status, data } });
  return error;
}

describe('getApiErrorMessage', () => {
  it('displays server exception details with the error reference', () => {
    expect(getApiErrorMessage(apiError(500, { detail: 'Operation failed.', traceId: 'request-123' })))
      .toBe('Operation failed. (Reference: request-123)');
  });

  it('preserves business validation messages', () => {
    expect(getApiErrorMessage(apiError(400, { detail: 'Name is required.', traceId: 'request-123' })))
      .toBe('Name is required.');
  });

  it('prefers field validation messages', () => {
    expect(getApiErrorMessage(apiError(400, { title: 'Validation failed', errors: { name: ['Enter a name.'] } })))
      .toBe('Enter a name.');
  });

  it('handles network failures without a problem response', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'))).toBe('Could not connect to the server.');
  });
});
