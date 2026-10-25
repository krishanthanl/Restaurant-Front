import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useOrderMutation } from './useOrderMutation';
import type { Order } from '../types/orderTypes';

afterEach(cleanup);
it('locks immediately and preserves the original request after an ambiguous failure', async () => {
  const reload = vi.fn().mockResolvedValue(undefined);
  const original = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({ id: 'o1' } as Order);
  const duplicate = vi.fn();
  const saved = vi.fn();
  const { result } = renderHook(() => useOrderMutation(reload));
  await act(async () => {
    const first = result.current.run(original, saved);
    await result.current.run(duplicate);
    await first;
  });
  expect(original).toHaveBeenCalledTimes(1); expect(duplicate).not.toHaveBeenCalled();
  expect(result.current.retryPending).toBe(true); expect(result.current.blocked).toBe(true);
  await act(async () => { await result.current.retry(); });
  expect(original).toHaveBeenCalledTimes(2); expect(saved).toHaveBeenCalledTimes(1);
  expect(result.current.retryPending).toBe(false); expect(reload).toHaveBeenCalledTimes(2);
});

it('refreshes stale data after a conflict and unlocks the next corrected write', async () => {
  const reload = vi.fn().mockResolvedValue(undefined);
  const task = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Order changed' } } });
  const { result } = renderHook(() => useOrderMutation(reload));
  await act(async () => { await result.current.run(task); });
  expect(result.current.error).toBe('Order changed'); expect(reload).toHaveBeenCalledOnce();
  expect(result.current.retryPending).toBe(false); expect(result.current.blocked).toBe(false);
});

it('blocks new writes until refresh succeeds after a failed refresh', async () => {
  const reload = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
  const { result } = renderHook(() => useOrderMutation(reload));
  await act(async () => { await result.current.run(async () => ({ id: 'o1' } as Order)); });
  expect(result.current.refreshRequired).toBe(true); expect(result.current.blocked).toBe(true);
  await act(async () => { await result.current.refresh(); });
  await waitFor(() => expect(result.current.blocked).toBe(false));
});

it('shows the returned order after a successful write instead of reloading', async () => {
  const reload = vi.fn().mockResolvedValue(undefined);
  const apply = vi.fn();
  const saved = { id: 'o1', rowVersion: 'v2' } as Order;
  const { result } = renderHook(() => useOrderMutation(reload, apply));
  await act(async () => { await result.current.run(async () => saved); });
  expect(apply).toHaveBeenCalledWith(saved); expect(reload).not.toHaveBeenCalled();
  expect(result.current.blocked).toBe(false);
});

it('reloads instead of applying when a retried write succeeds', async () => {
  const reload = vi.fn().mockResolvedValue(undefined);
  const apply = vi.fn();
  const task = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({ id: 'o1' } as Order);
  const { result } = renderHook(() => useOrderMutation(reload, apply));
  await act(async () => { await result.current.run(task); });
  await act(async () => { await result.current.retry(); });
  expect(apply).not.toHaveBeenCalled(); expect(reload).toHaveBeenCalledTimes(2);
});
