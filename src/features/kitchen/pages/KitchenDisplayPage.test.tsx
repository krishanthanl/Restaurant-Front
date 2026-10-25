import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { KitchenDisplayPage } from './KitchenDisplayPage';
import { kitchenApi } from '../../kitchens/api/kitchenApi';
import { kitchenTicketApi } from '../api/kitchenTicketApi';
import type { Kitchen } from '../../kitchens/types/kitchenTypes';
import type { KitchenTicket } from '../types/kitchenTicketTypes';

vi.mock('../../kitchens/api/kitchenApi', () => ({ kitchenApi: { getKitchens: vi.fn() } }));
vi.mock('../api/kitchenTicketApi', () => ({ kitchenTicketApi: { active: vi.fn(), advance: vi.fn() } }));
const kitchen = (id: string, name: string, code: string) => ({ id, name, code, description: null, displayOrder: 0, isActive: true, activeMenuItemCount: 1, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'k' }) as Kitchen;
const ticket: KitchenTicket = {
  id: 'tk1', orderId: 'o1', orderNumber: 42, ticketNumber: 1, kitchenId: 'hot', kitchenCode: 'HOT', kitchenName: 'Hot kitchen', status: 0,
  sentAtUtc: new Date().toISOString(), acknowledgedAtUtc: null, preparingAtUtc: null, preparedAtUtc: null, servedAtUtc: null,
  tables: [{ id: 't1', tableNumber: '4', capacity: 4 }], orderNotes: 'Birthday',
  lines: [{ id: 'l1', name: 'Soup', quantity: 2, notes: 'No salt', isVoided: false, voidReason: null }, { id: 'l2', name: 'Bread', quantity: 1, notes: null, isVoided: true, voidReason: 'Dropped' }],
  rowVersion: 'v1',
};
beforeEach(() => {
  vi.resetAllMocks();
  try { localStorage.clear(); } catch { /* not available */ }
  vi.mocked(kitchenApi.getKitchens).mockResolvedValue([kitchen('hot', 'Hot kitchen', 'HOT'), kitchen('bar', 'Bar', 'BAR')]);
  vi.mocked(kitchenTicketApi.active).mockResolvedValue([ticket]);
});
afterEach(cleanup);

it('shows the first station\'s tickets with tables, notes and voided lines', async () => {
  render(<KitchenDisplayPage />);
  const card = within(await screen.findByRole('article', { name: 'Order 42 ticket 1' }));
  expect(kitchenTicketApi.active).toHaveBeenCalledWith('hot', expect.any(AbortSignal));
  expect(card.getByText(/Tables 4/)).toBeInTheDocument();
  expect(card.getByText('No salt')).toBeInTheDocument();
  expect(card.getByText('1 × Bread (voided)')).toBeInTheDocument();
  expect(card.getByText('Order notes: Birthday')).toBeInTheDocument();
  expect(card.getByText('0 min since sent')).toBeInTheDocument();
});

it('moves a ticket forward once per click and shows the new status', async () => {
  let finish!: (value: KitchenTicket) => void;
  vi.mocked(kitchenTicketApi.advance).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<KitchenDisplayPage />);
  const start = await screen.findByRole('button', { name: 'Start preparing' });
  act(() => { start.click(); start.click(); });
  expect(kitchenTicketApi.advance).toHaveBeenCalledTimes(1);
  expect(kitchenTicketApi.advance).toHaveBeenCalledWith(ticket, 'start');
  await act(async () => { finish({ ...ticket, status: 2, rowVersion: 'v2' }); });
  expect(await screen.findByRole('button', { name: 'Mark prepared' })).toBeInTheDocument();
  expect(screen.getByText('Preparing')).toBeInTheDocument();
});

it('shows a rejected step and reloads the queue', async () => {
  vi.mocked(kitchenTicketApi.advance).mockRejectedValue(new Error('Ticket changed. Refresh and try again.'));
  const user = userEvent.setup(); render(<KitchenDisplayPage />);
  await user.click(await screen.findByRole('button', { name: 'Acknowledge' }));
  expect(await screen.findByText('Ticket changed. Refresh and try again.')).toBeInTheDocument();
  await waitFor(() => expect(kitchenTicketApi.active).toHaveBeenCalledTimes(2));
});

it('switches station and flags late tickets', async () => {
  vi.mocked(kitchenTicketApi.active).mockResolvedValueOnce([ticket])
    .mockResolvedValueOnce([{ ...ticket, id: 'tk2', kitchenId: 'bar', orderNumber: 7, sentAtUtc: new Date(Date.now() - 20 * 60_000).toISOString() }]);
  const user = userEvent.setup(); render(<KitchenDisplayPage />);
  await screen.findByRole('article', { name: 'Order 42 ticket 1' });
  await user.click(screen.getByRole('combobox', { name: 'Station' }));
  await user.click(screen.getByRole('option', { name: 'Bar (BAR)' }));
  const card = within(await screen.findByRole('article', { name: 'Order 7 ticket 1' }));
  expect(kitchenTicketApi.active).toHaveBeenLastCalledWith('bar', expect.any(AbortSignal));
  expect(card.getByText('20 min since sent · late')).toBeInTheDocument();
});

it('explains an empty queue and a restaurant without kitchens', async () => {
  vi.mocked(kitchenTicketApi.active).mockResolvedValue([]);
  render(<KitchenDisplayPage />);
  expect(await screen.findByText('No tickets')).toBeInTheDocument();
  cleanup();
  vi.mocked(kitchenApi.getKitchens).mockResolvedValue([]);
  render(<KitchenDisplayPage />);
  expect(await screen.findByText('No active kitchens')).toBeInTheDocument();
});
