import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/apiClient';
import { diningSessionApi } from './diningSessionApi';
import type { DiningSession } from '../types/diningSessionTypes';

const session = { id: 's1', rowVersion: 'AAAAAAAAB9E=' } as DiningSession;

afterEach(() => vi.restoreAllMocks());

describe('diningSessionApi', () => {
  it('lists active sessions with filters and the abort signal', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [session] });
    const signal = new AbortController().signal;
    await expect(diningSessionApi.list('hall', undefined, signal)).resolves.toEqual([session]);
    expect(get).toHaveBeenCalledWith('/dining-sessions', { params: { status: 0, areaId: 'hall', waiterId: undefined }, signal });
  });

  it('opens a single table with its row version, sending empty waiter and notes as null', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: session });
    await diningSessionApi.open('t1', 2, '', '', 'table-v1');
    expect(post).toHaveBeenCalledWith('/dining-sessions', { tableId: 't1', guestCount: 2, waiterId: null, notes: null, tableRowVersion: 'table-v1' });
  });

  it('sends the row version and reason when closing or cancelling', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: session });
    await diningSessionApi.close('s1', session.rowVersion, 'Guests left');
    expect(post).toHaveBeenLastCalledWith('/dining-sessions/s1/close', { rowVersion: session.rowVersion, reason: 'Guests left' });
    await diningSessionApi.cancel('s1', session.rowVersion, 'Opened in error');
    expect(post).toHaveBeenLastCalledWith('/dining-sessions/s1/cancel', { rowVersion: session.rowVersion, reason: 'Opened in error' });
  });

  it('sends the row version with session edits', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: session });
    await diningSessionApi.update(session, { guestCount: 3, waiterId: null, notes: null });
    expect(put).toHaveBeenCalledWith('/dining-sessions/s1', { guestCount: 3, waiterId: null, notes: null, rowVersion: session.rowVersion });
  });
});
