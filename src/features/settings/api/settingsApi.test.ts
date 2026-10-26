import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/apiClient';
import { settingsApi } from './settingsApi';

vi.mock('../../../services/apiClient', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('reads and saves restaurant settings with the row version', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { allowMultipleOrdersPerDiningSession: false, updatedAtUtc: null, rowVersion: '' } });
  vi.mocked(apiClient.put).mockResolvedValue({ data: { allowMultipleOrdersPerDiningSession: true, updatedAtUtc: null, rowVersion: 'v1' } });
  const signal = new AbortController().signal;
  await settingsApi.get(signal);
  expect(apiClient.get).toHaveBeenCalledWith('/settings', { signal });
  await settingsApi.update({ allowMultipleOrdersPerDiningSession: true, rowVersion: '' });
  expect(apiClient.put).toHaveBeenCalledWith('/settings', { allowMultipleOrdersPerDiningSession: true, rowVersion: '' });
});
