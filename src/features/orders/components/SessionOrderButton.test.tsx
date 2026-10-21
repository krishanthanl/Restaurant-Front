import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SessionOrderButton } from './SessionOrderButton';
import { orderApi } from '../api/orderApi';
import { diningSessionApi } from '../../dining-sessions/api/diningSessionApi';
import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';
import type { Order } from '../types/orderTypes';

vi.mock('../api/orderApi', () => ({ orderApi: { forSession: vi.fn(), create: vi.fn() } }));
vi.mock('../../dining-sessions/api/diningSessionApi', () => ({ diningSessionApi: { get: vi.fn() } }));
const session = { id: 's1', rowVersion: 'version1', status: 0 } as DiningSession;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(orderApi.forSession).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  vi.mocked(diningSessionApi.get).mockResolvedValue(session);
});
afterEach(cleanup);
it('starts with the latest session version after guest or waiter details change', async () => {
  vi.mocked(orderApi.create).mockResolvedValue({ id: 'o1', orderNumber: 1 } as Order);
  const { rerender } = render(<SessionOrderButton session={session} disabled={false} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start order' })).not.toBeDisabled());
  rerender(<SessionOrderButton session={{ ...session, rowVersion: 'version2' }} disabled={false} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start order' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Start order' }));
  await waitFor(() => expect(orderApi.create).toHaveBeenCalledWith('s1', 'version2', expect.any(String)));
});
it('opens the existing shared order', async () => {
  vi.mocked(orderApi.forSession).mockResolvedValue({ id: 'o1', orderNumber: 17 } as Order);
  render(<SessionOrderButton session={session} disabled={false} />);
  expect(await screen.findByRole('link', { name: 'Open order #17' })).toHaveAttribute('href', '/orders/o1');
  expect(orderApi.create).not.toHaveBeenCalled();
});
