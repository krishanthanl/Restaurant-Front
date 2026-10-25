import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/apiClient';
import { billingApi } from './billingApi';
afterEach(() => vi.restoreAllMocks());
it('sends queue filters and cancellation signal to the server', async () => {
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { items: [] } });
  const signal = new AbortController().signal;
  const query = { paid: true, page: 2, pageSize: 20, areaId: 'area1' };
  await billingApi.queue(query, signal);
  expect(get).toHaveBeenCalledWith('/billing/queue', { params: query, signal });
});
it('preserves the payment operation ID, row version, and tendered amount', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
  const payment = { method: 0, amount: 400, tenderedAmount: 500, rowVersion: 'version', operationId: 'operation' };
  await billingApi.pay('bill1', payment);
  expect(post).toHaveBeenCalledWith('/bills/bill1/payments', payment);
});
