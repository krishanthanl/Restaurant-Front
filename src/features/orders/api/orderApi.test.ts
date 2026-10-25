import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/apiClient';
import { orderApi } from './orderApi';

vi.mock('../../../services/apiClient', () => ({ apiClient: { post: vi.fn(), put: vi.fn(), delete: vi.fn(), get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('sends DELETE concurrency and operation identity in the request body', async () => {
  vi.mocked(apiClient.delete).mockResolvedValue({ data: { id: 'order' } });
  await orderApi.remove('order', 'line', 'version', 'operation');
  expect(apiClient.delete).toHaveBeenCalledWith('/orders/order/items/line', { data: { rowVersion: 'version', operationId: 'operation' } });
});

it('uses the supplied operation identity unchanged when retrying', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'order' } });
  await orderApi.add('order', 'menu', 2, 'No salt', 'version', 'same-operation');
  await orderApi.add('order', 'menu', 2, 'No salt', 'version', 'same-operation');
  expect(vi.mocked(apiClient.post).mock.calls[0]).toEqual(vi.mocked(apiClient.post).mock.calls[1]);
});

it('reopens with the order version and operation identity', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'order' } });
  await orderApi.reopen('order', 'version', 'operation');
  expect(apiClient.post).toHaveBeenCalledWith('/orders/order/reopen', { rowVersion: 'version', operationId: 'operation' });
});

it('sends to the kitchen and voids with the order version, operation identity and reason', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'order' } });
  await orderApi.sendToKitchen('order', 'version', 'operation');
  expect(apiClient.post).toHaveBeenLastCalledWith('/orders/order/send-to-kitchen', { rowVersion: 'version', operationId: 'operation' });
  await orderApi.voidItem('order', 'line', 'Dropped', 'version', 'operation-2');
  expect(apiClient.post).toHaveBeenLastCalledWith('/orders/order/items/line/void', { rowVersion: 'version', operationId: 'operation-2', reason: 'Dropped' });
});
