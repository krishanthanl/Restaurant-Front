import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OrderPage } from './OrderPage';
import { orderApi } from '../api/orderApi';
import { menuApi } from '../../menu/api/menuApi';
import { useAuth } from '../../authentication/useAuth';
import type { Order } from '../types/orderTypes';
import type { MenuItem } from '../../menu/types/menuTypes';
import { kitchenTicketApi } from '../../kitchen/api/kitchenTicketApi';

vi.mock('../api/orderApi', () => ({ orderApi: { get: vi.fn(), add: vi.fn(), updateItem: vi.fn(), notes: vi.fn(), ready: vi.fn(), end: vi.fn(), remove: vi.fn(), reopen: vi.fn(), sendToKitchen: vi.fn(), voidItem: vi.fn(), setCheckLabel: vi.fn() } }));
vi.mock('../../kitchen/api/kitchenTicketApi', () => ({ kitchenTicketApi: { advance: vi.fn() } }));
vi.mock('../../menu/api/menuApi', () => ({ menuApi: { getCategories: vi.fn(), getItems: vi.fn() } }));
vi.mock('../../authentication/useAuth', () => ({ useAuth: vi.fn() }));
const base: Order = {
  id: 'o1', orderNumber: 42, diningSessionId: 's1', status: 0, guestCount: 3, waiterId: null, waiterName: null,
  areaId: 'a1', tables: [{ id: 't1', tableNumber: '1', capacity: 4 }, { id: 't2', tableNumber: '2', capacity: 4 }],
  subtotal: 25.5, quantityTotal: 2, openedAtUtc: '2026-10-21T10:00:00Z', notes: null, openedBy: 'u1', updatedAtUtc: null,
  closedAtUtc: null, closedBy: null, cancelledAtUtc: null, cancelledBy: null, cancellationReason: null,
  items: [{ id: 'l1', menuItemId: 'm1', name: 'Soup', quantity: 2, unitPrice: 12.75, lineTotal: 25.5, kitchenId: 'k1', kitchenCode: 'HOT', kitchenName: 'Hot kitchen', notes: null }],
  rowVersion: 'v1', sessionRowVersion: 's1v',
};
const menuItem = { id: 'm1', name: 'Soup', price: 99, isOrderable: true, kitchenName: 'Hot kitchen' } as MenuItem;
const show = () => render(<MemoryRouter initialEntries={['/orders/o1']}><Routes><Route path="/orders/:id" element={<OrderPage />} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(orderApi.get).mockResolvedValue(base);
  vi.mocked(menuApi.getCategories).mockResolvedValue([]);
  vi.mocked(menuApi.getItems).mockResolvedValue({ items: [menuItem, { ...menuItem, id: 'm2', name: 'Sold out soup', isOrderable: false }], page: 1, pageSize: 12, totalCount: 2 });
  vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as unknown as ReturnType<typeof useAuth>);
});
afterEach(cleanup);

it('shows combined tables and server subtotal, and prevents unavailable additions', async () => {
  show();
  await screen.findByText(/Tables 1 \+ 2/);
  expect(screen.getByText('Subtotal: 25.50')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Add Sold out soup' })).toBeDisabled();
});

it('retains unsaved notes after a conflict and reloads authoritative data', async () => {
  vi.mocked(orderApi.notes).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Order changed. Refresh.' } } });
  show(); await screen.findByLabelText('Order notes');
  fireEvent.change(screen.getByLabelText('Order notes'), { target: { value: 'Allergy' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save notes' }));
  expect(await screen.findByText('Order changed. Refresh.')).toBeInTheDocument();
  await waitFor(() => expect(orderApi.get).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('Order notes')).toHaveValue('Allergy');
});

it('disables mutations while an add is in flight and submits once', async () => {
  let finish!: (order: Order) => void;
  vi.mocked(orderApi.add).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show();
  const button = await screen.findByRole('button', { name: 'Add Soup' });
  fireEvent.click(button); fireEvent.click(button);
  expect(orderApi.add).toHaveBeenCalledTimes(1); expect(button).toBeDisabled();
  finish(base);
  await waitFor(() => expect(button).not.toBeDisabled());
});

it('shows frozen order details to a cashier and explains manual closure', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...sentOrder, status: 1, billingStatus: 2, tickets: [{ ...sentOrder.tickets![0], status: 4 }] });
  vi.mocked(useAuth).mockReturnValue({ hasPermission: (p: string) => p === 'billing.manage' } as unknown as ReturnType<typeof useAuth>);
  show(); await screen.findByText('Pending billing');
  expect(screen.queryByRole('button', { name: 'Save item' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close visit' }));
  expect(screen.getByText(/Payment is complete/)).toBeInTheDocument();
});

it('closes only this check while the visit has other open checks', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...sentOrder, status: 1, billingStatus: 2, checkLabel: 'Seat 2', otherActiveCheckCount: 1, tickets: [{ ...sentOrder.tickets![0], status: 4 }] });
  vi.mocked(orderApi.end).mockResolvedValue({ ...sentOrder, status: 2 });
  show();
  expect(await screen.findByRole('heading', { name: 'Seat 2 · Order #42' })).toBeInTheDocument();
  expect(screen.getByText(/1 other open check\./)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Close visit' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close check' }));
  expect(screen.getByText(/Only this check ends/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(orderApi.end).toHaveBeenCalledWith('o1', 'close', 'v1', 's1v', expect.any(String), undefined));
});

it('warns that closing the last check ends the visit', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...sentOrder, status: 1, billingStatus: 2, otherActiveCheckCount: 0, tickets: [{ ...sentOrder.tickets![0], status: 4 }] });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Close visit' }));
  expect(screen.getByText(/This is the last open check/)).toBeInTheDocument();
});

it('renames the check, sending a blank label as null', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...base, checkLabel: 'Seat 1', separateChecksEnabled: true });
  vi.mocked(orderApi.setCheckLabel).mockResolvedValue({ ...base, checkLabel: null, rowVersion: 'v2', separateChecksEnabled: true });
  show();
  const field = await screen.findByLabelText('Check label');
  expect(field).toHaveValue('Seat 1');
  fireEvent.change(field, { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save label' }));
  await waitFor(() => expect(orderApi.setCheckLabel).toHaveBeenCalledWith('o1', null, 'v1', expect.any(String)));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save label' })).toBeDisabled());
});

it('hides check labelling when separate checks are turned off', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...base, checkLabel: 'Seat 1', separateChecksEnabled: false });
  show();
  expect(await screen.findByText('Check: Seat 1')).toBeInTheDocument();
  expect(screen.queryByLabelText('Check label')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save label' })).not.toBeInTheDocument();
});

it('handles empty menus and load errors', async () => {
  vi.mocked(menuApi.getItems).mockResolvedValue({ items: [], page: 1, pageSize: 12, totalCount: 0 });
  show(); expect(await screen.findByText('No menu items')).toBeInTheDocument();
});

it.each(['Quantity for Soup', 'Notes for Soup'])('blocks readiness while %s contains unsaved changes', async label => {
  show(); await screen.findByLabelText(label);
  fireEvent.change(screen.getByLabelText(label), { target: { value: label.startsWith('Quantity') ? '3' : 'Peanut allergy' } });
  expect(screen.getByRole('button', { name: 'Request bill' })).toBeDisabled();
  expect(orderApi.ready).not.toHaveBeenCalled();
});

it('keeps line drafts and the readiness guard when retrying a failed menu search', async () => {
  show(); await screen.findByRole('button', { name: 'Add Soup' }, { timeout: 5000 });
  fireEvent.change(screen.getByLabelText('Notes for Soup'), { target: { value: 'Peanut allergy' } });
  vi.mocked(menuApi.getItems).mockRejectedValueOnce(new Error('Menu unavailable'));
  fireEvent.change(screen.getByLabelText('Search menu'), { target: { value: 'soup' } });
  await screen.findByText('Menu unavailable');
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  await screen.findByRole('button', { name: 'Add Soup' }, { timeout: 5000 });
  expect(screen.getByLabelText('Notes for Soup')).toHaveValue('Peanut allergy');
  expect(screen.getByRole('button', { name: 'Request bill' })).toBeDisabled();
});

it('shows the saved order after an add without reloading the order or menu', async () => {
  vi.mocked(orderApi.add).mockResolvedValue({ ...base, subtotal: 38.25, rowVersion: 'v2', items: [{ ...base.items[0], quantity: 3, lineTotal: 38.25 }] });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Add Soup' }));
  expect(await screen.findByText('Subtotal: 38.25')).toBeInTheDocument();
  expect(orderApi.get).toHaveBeenCalledTimes(1);
  expect(menuApi.getItems).toHaveBeenCalledTimes(1);
});

it('reopens an order that is ready to bill so late items can be added', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...base, status: 1 });
  vi.mocked(orderApi.reopen).mockResolvedValue({ ...base, status: 0, rowVersion: 'v2' });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Reopen to add items' }));
  await waitFor(() => expect(orderApi.reopen).toHaveBeenCalledWith('o1', 'v1', expect.any(String)));
  expect(await screen.findByRole('button', { name: 'Add Soup' })).toBeInTheDocument();
});

it('does not offer reopening without the submit permission', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...base, status: 1 });
  vi.mocked(useAuth).mockReturnValue({ hasPermission: (permission: string) => permission === 'billing.manage' } as unknown as ReturnType<typeof useAuth>);
  show();
  await screen.findByRole('button', { name: 'Close visit' });
  expect(screen.queryByRole('button', { name: 'Reopen to add items' })).not.toBeInTheDocument();
});

const sentOrder: Order = {
  ...base,
  items: [{ ...base.items[0], kitchenTicketId: 'tk1', sentAtUtc: '2026-10-21T10:05:00Z' }],
  tickets: [{ id: 'tk1', ticketNumber: 1, kitchenId: 'k1', kitchenCode: 'HOT', kitchenName: 'Hot kitchen', status: 2, sentAtUtc: '2026-10-21T10:05:00Z', preparedAtUtc: null, servedAtUtc: null, rowVersion: 'tv1' }],
};

it('sends new items to the kitchen before the bill can be requested', async () => {
  vi.mocked(orderApi.sendToKitchen).mockResolvedValue({ ...sentOrder, rowVersion: 'v2' });
  show();
  expect(await screen.findByRole('button', { name: 'Request bill' })).toBeDisabled();
  expect(screen.getByText('Send new items to the kitchen before requesting the bill.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send to kitchen (1)' }));
  await waitFor(() => expect(orderApi.sendToKitchen).toHaveBeenCalledWith('o1', 'v1', expect.any(String)));
  expect(await screen.findByText('Sent · Hot kitchen · Preparing')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Send to kitchen/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Quantity for Soup')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Request bill' })).toBeDisabled();
});

it.each([0, 1, 2, 3] as const)('blocks billing and explains unserved ticket status %s', async status => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...sentOrder, tickets: [{ ...sentOrder.tickets![0], status }] });
  show();
  expect(await screen.findByRole('button', { name: 'Request bill' })).toBeDisabled();
  expect(screen.getByText('1 kitchen ticket still needs to be marked served before billing or closing.')).toBeInTheDocument();
});

it('blocks closing an existing ready-to-bill order with unserved food', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...sentOrder, status: 1 });
  show();
  expect(await screen.findByRole('button', { name: 'Close visit' })).toBeDisabled();
  expect(orderApi.end).not.toHaveBeenCalled();
});

it('allows billing once the ticket is marked served', async () => {
  vi.mocked(orderApi.get).mockResolvedValue({ ...sentOrder, tickets: [{ ...sentOrder.tickets![0], status: 4 }] });
  show();
  expect(await screen.findByRole('button', { name: 'Request bill' })).toBeEnabled();
});

it('voids a sent item with a reason when the user may', async () => {
  vi.mocked(orderApi.get).mockResolvedValue(sentOrder);
  vi.mocked(orderApi.voidItem).mockResolvedValue({ ...sentOrder, subtotal: 0, rowVersion: 'v2', items: [{ ...sentOrder.items[0], lineTotal: 0, voidedAtUtc: '2026-10-21T10:10:00Z', voidReason: 'Guest changed mind' }] });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Void item' }));
  expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Void reason'), { target: { value: 'Guest changed mind' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(orderApi.voidItem).toHaveBeenCalledWith('o1', 'l1', 'Guest changed mind', 'v1', expect.any(String)));
  expect(await screen.findByText('Voided: Guest changed mind')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Void item' })).not.toBeInTheDocument();
});

it('hides voiding from staff without the after-kitchen permission', async () => {
  vi.mocked(orderApi.get).mockResolvedValue(sentOrder);
  vi.mocked(useAuth).mockReturnValue({ hasPermission: (p: string) => p !== 'orders.void-after-kitchen' } as unknown as ReturnType<typeof useAuth>);
  show();
  await screen.findByText('Sent · Hot kitchen · Preparing');
  expect(screen.queryByRole('button', { name: 'Void item' })).not.toBeInTheDocument();
});

it('marks prepared food as served and shows the refreshed order', async () => {
  const prepared = { ...sentOrder, tickets: [{ ...sentOrder.tickets![0], status: 3 as const }] };
  vi.mocked(orderApi.get).mockResolvedValueOnce(prepared).mockResolvedValue({ ...prepared, tickets: [{ ...prepared.tickets[0], status: 4 as const }] });
  vi.mocked(kitchenTicketApi.advance).mockResolvedValue({} as never);
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Mark served' }));
  await waitFor(() => expect(kitchenTicketApi.advance).toHaveBeenCalledWith(prepared.tickets[0], 'served'));
  expect(await screen.findByText('Served')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark served' })).not.toBeInTheDocument();
});
