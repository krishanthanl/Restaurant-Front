import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/apiClient';
import { kitchenTicketApi } from './kitchenTicketApi';

afterEach(() => vi.restoreAllMocks());

it('lists a station\'s active tickets with the abort signal', async () => {
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
  const signal = new AbortController().signal;
  await kitchenTicketApi.active('hot', signal);
  expect(get).toHaveBeenCalledWith('/kitchen-tickets/active', { params: { kitchenId: 'hot' }, signal });
});

it('sends the ticket version with each step', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
  await kitchenTicketApi.advance({ id: 'tk1', rowVersion: 'v1' }, 'prepared');
  expect(post).toHaveBeenCalledWith('/kitchen-tickets/tk1/prepared', { rowVersion: 'v1' });
});
