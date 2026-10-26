import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TableDashboardPage } from './TableDashboardPage';
import { diningSessionApi } from '../../dining-sessions/api/diningSessionApi';
import { tableApi } from '../api/tableApi';
import { areaApi } from '../../areas/api/areaApi';
import { useAuth } from '../../authentication/useAuth';
import { orderApi } from '../../orders/api/orderApi';
import type { RestaurantTable } from '../types/tableTypes';
import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';

vi.mock('../../dining-sessions/api/diningSessionApi', () => ({ diningSessionApi: { list: vi.fn(), openCombined: vi.fn(), waiters: vi.fn(), active: vi.fn(), open: vi.fn(), close: vi.fn(), update: vi.fn(), cancel: vi.fn() } }));
vi.mock('../api/tableApi', () => ({ tableApi: { getTables: vi.fn(), markReady: vi.fn() } }));
vi.mock('../../areas/api/areaApi', () => ({ areaApi: { getAreas: vi.fn() } }));
vi.mock('../../authentication/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../orders/api/orderApi', () => ({ orderApi: { listForSession: vi.fn().mockResolvedValue([]) } }));
const base: RestaurantTable = { id: 't0', restaurantId: 'r1', areaId: 'hall', tableNumber: '1', name: null, capacity: 4, tableType: 0, displayOrder: 0, isActive: true, currentStatus: 0, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'v1' };
const activeSession: DiningSession = { id: 's1', restaurantId: 'r1', guestCount: 2, openedBy: 'u1', waiterId: null, waiterName: null, openedAt: '2026-10-02T10:00:00Z', status: 0, closedAt: null, tableIds: ['t0'], notes: null, createdAtUtc: '', updatedAtUtc: null, cancelledAt: null, closedBy: null, cancelledBy: null, cancellationReason: null, rowVersion: 'version1' };
const tables = Array.from({ length: 6 }, (_, index) => ({ ...base, id: `t${index}`, tableNumber: String(index + 1), areaId: index === 1 ? 'patio' : 'hall', currentStatus: index }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(orderApi.listForSession).mockResolvedValue([]);
  vi.mocked(diningSessionApi.list).mockResolvedValue([]);
  vi.mocked(diningSessionApi.waiters).mockResolvedValue([]);
  vi.mocked(useAuth).mockReturnValue({ user: { role: 'Manager' }, hasPermission: () => true } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(tableApi.getTables).mockResolvedValue([...tables, { ...base, id: 'inactive', tableNumber: '7', isActive: false }]);
  vi.mocked(areaApi.getAreas).mockResolvedValue(['hall', 'patio'].map((id, index) => ({ id, restaurantId: 'r1', name: id === 'hall' ? 'Hall' : 'Patio', description: null, displayOrder: index, isActive: true, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'v1' })));
});
afterEach(cleanup);

it('groups tables by area and counts active operational statuses separately from total tables', async () => {
  render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  const summary = within(await screen.findByRole('region', { name: 'Table summary' }));
  expect(summary.getByText('7')).toBeInTheDocument();
  expect(summary.getAllByText('1')).toHaveLength(5);
  expect(within(screen.getByRole('region', { name: 'Patio' })).getByRole('button', { name: 'Table 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Table 7, inactive' })).toBeDisabled();
});

it('opens active table details and prevents inactive tables from opening', async () => {
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Table 7, inactive' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Table 1' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText('Area: Hall')).toBeInTheDocument();
  expect(dialog.getByText('Capacity: 4 guests')).toBeInTheDocument();
  expect(dialog.getByText('Status: Available')).toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: 'Close details' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('combines area and operational filters while keeping area summary counts independent of status', async () => {
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>); await screen.findByRole('button', { name: 'Table 1' });
  await user.click(screen.getByRole('combobox', { name: 'Area' })); await user.click(screen.getByRole('option', { name: 'Patio' }));
  expect(screen.queryByRole('button', { name: 'Table 1' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: 'Operational status' })); await user.click(screen.getByRole('option', { name: 'Available' }));
  expect(screen.getByText('No matching tables')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Table summary' })).getAllByText('1')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole('button', { name: 'Table 1' })).toBeInTheDocument();
});

it('refreshes information and uses the active-only API for waiters', async () => {
  vi.mocked(useAuth).mockReturnValue({ user: { role: 'Waiter' }, hasPermission: (permission: string) => permission === 'orders.create' } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(tableApi.getTables).mockResolvedValueOnce([base]).mockResolvedValueOnce([{ ...base, currentStatus: 4 }]);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>); await screen.findByRole('button', { name: 'Table 1' });
  expect(tableApi.getTables).toHaveBeenCalledWith('active', undefined, expect.any(AbortSignal));
  await user.click(screen.getByRole('button', { name: 'Refresh tables' }));
  await waitFor(() => expect(within(screen.getByRole('button', { name: 'Table 1' })).getByText('Cleaning')).toBeInTheDocument());
  expect(areaApi.getAreas).toHaveBeenCalledTimes(2);
});

it('shows load errors and retries', async () => {
  vi.mocked(tableApi.getTables).mockRejectedValueOnce(new Error('Unable to load tables'));
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  expect(await screen.findByText('Unable to load tables')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Table summary' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('button', { name: 'Table 1' });
});

it('handles an empty restaurant', async () => {
  vi.mocked(tableApi.getTables).mockResolvedValue([]);
  render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  expect(await screen.findByText('No tables yet')).toBeInTheDocument();
});

it('opens a dining session and refreshes occupied status', async () => {
  vi.mocked(tableApi.getTables).mockResolvedValueOnce([base]).mockResolvedValueOnce([{ ...base, currentStatus: 1 }]);
  vi.mocked(diningSessionApi.active).mockResolvedValue(activeSession);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  const guests = screen.getByRole('spinbutton', { name: 'Number of guests' });
  await user.clear(guests); await user.type(guests, '2');
  await user.click(screen.getByRole('button', { name: 'Open Table' }));
  await waitFor(() => expect(diningSessionApi.open).toHaveBeenCalledWith('t0', 2, '', '', 'v1'));
  const dialog = within(screen.getByRole('dialog'));
  expect(await dialog.findByText('Status: Occupied')).toBeInTheDocument();
  expect(await dialog.findByRole('button', { name: 'Start order' })).toBeInTheDocument();
  expect(dialog.queryByRole('button', { name: 'Open Table' })).not.toBeInTheDocument();
});
it('displays active session details and closes the visit', async () => {
  const session = { id: 's1', restaurantId: 'r1', guestCount: 3, openedBy: 'u1', waiterId: 'w1', waiterName: 'Nimal', openedAt: '2026-10-02T10:00:00Z', status: 0, closedAt: null, tableIds: ['t0'], notes: null, createdAtUtc: '', updatedAtUtc: null, cancelledAt: null, closedBy: null, cancelledBy: null, cancellationReason: null, rowVersion: 's-v1' };
  vi.mocked(tableApi.getTables).mockResolvedValueOnce([{ ...base, currentStatus: 1 }]).mockResolvedValueOnce([base]);
  vi.mocked(diningSessionApi.active).mockResolvedValue(session);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  expect(await screen.findByText('Guests: 3')).toBeInTheDocument();
  expect(screen.getByText('Waiter: Nimal')).toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: 'Close dining session' }));
  expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: 'Reason for closing' }), 'Guests left before ordering');
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(diningSessionApi.close).toHaveBeenCalledWith('s1', 's-v1', 'Guests left before ordering'));
  expect(await screen.findByText('Dining session closed.')).toBeInTheDocument();
  await waitFor(() => expect(within(screen.getByRole('button', { name: 'Table 1' })).getByText('Available')).toBeInTheDocument());
});
it('keeps the dialog open with an error when opening conflicts', async () => {
  vi.mocked(diningSessionApi.open).mockRejectedValue(new Error('Table already occupied'));
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open Table' })).toBeEnabled());
  await user.type(screen.getByRole('textbox', { name: 'Session notes' }), 'Window seat');
  await user.click(screen.getByRole('button', { name: 'Open Table' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Table already occupied');
  await waitFor(() => expect(tableApi.getTables).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open Table' })).toBeEnabled());
  expect(screen.getByRole('alert')).toHaveTextContent('Table already occupied');
  expect(screen.getByRole('textbox', { name: 'Session notes' })).toHaveValue('Window seat');
});

it('sends one open request when the button is clicked twice quickly', async () => {
  vi.mocked(diningSessionApi.open).mockReturnValue(new Promise(() => {}));
  render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Table 1' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open Table' })).toBeEnabled());
  const open = screen.getByRole('button', { name: 'Open Table' });
  act(() => { open.click(); open.click(); });
  expect(diningSessionApi.open).toHaveBeenCalledTimes(1);
});

it('offers ending a visit only when it has no open check', async () => {
  vi.mocked(tableApi.getTables).mockResolvedValue([{ ...base, currentStatus: 1 }]);
  vi.mocked(diningSessionApi.active).mockResolvedValue(activeSession);
  vi.mocked(orderApi.listForSession).mockResolvedValue([{ id: 'o1', orderNumber: 4, checkLabel: 'Seat 1', status: 0, subtotal: 10, billingStatus: null, openedAtUtc: '', rowVersion: 'v' }]);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  // Separate checks are off by default, so the original single-order button is shown.
  expect(await screen.findByRole('link', { name: 'Open order #4' })).toHaveAttribute('href', '/orders/o1');
  expect(screen.queryByRole('button', { name: 'Add check' })).not.toBeInTheDocument();
  expect(await screen.findByText('This visit has open checks. The visit ends when its last check is closed or cancelled.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Close dining session' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancel dining session' })).not.toBeInTheDocument();
});

it('shows a failed close and reloads the session so a retry uses the new version', async () => {
  vi.mocked(tableApi.getTables).mockImplementation(async () => [{ ...base, currentStatus: 1 }]);
  vi.mocked(diningSessionApi.active).mockResolvedValueOnce(activeSession).mockResolvedValue({ ...activeSession, rowVersion: 'version2' });
  vi.mocked(diningSessionApi.close).mockRejectedValueOnce(new Error('Session changed. Refresh and try again.'));
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  await user.click(await screen.findByRole('button', { name: 'Close dining session' }));
  await user.type(screen.getByRole('textbox', { name: 'Reason for closing' }), 'Left');
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Session changed. Refresh and try again.');
  await waitFor(() => expect(diningSessionApi.active).toHaveBeenCalledTimes(2));
  await user.click(await screen.findByRole('button', { name: 'Close dining session' }));
  await user.type(screen.getByRole('textbox', { name: 'Reason for closing' }), 'Left');
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(diningSessionApi.close).toHaveBeenLastCalledWith('s1', 'version2', 'Left'));
});

it('validates capacity and sends the selected waiter', async () => {
  vi.mocked(diningSessionApi.waiters).mockResolvedValue([{ id: 'w1', fullName: 'Nimal' }]);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  const guests = screen.getByRole('spinbutton', { name: 'Number of guests' });
  await user.clear(guests); await user.type(guests, '5');
  expect(screen.getByRole('button', { name: 'Open Table' })).toBeDisabled();
  await user.clear(guests); await user.type(guests, '4');
  await user.click(screen.getByRole('combobox', { name: 'Waiter' }));
  await user.click(await screen.findByRole('option', { name: 'Nimal' }));
  await user.click(screen.getByRole('button', { name: 'Open Table' }));
  await waitFor(() => expect(diningSessionApi.open).toHaveBeenCalledWith('t0', 4, 'w1', '', 'v1'));
});


it('opens a session with notes', async () => {
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  await user.type(screen.getByRole('textbox', { name: 'Session notes' }), 'Window seat');
  await user.click(screen.getByRole('button', { name: 'Open Table' }));
  await waitFor(() => expect(diningSessionApi.open).toHaveBeenCalledWith('t0', 1, '', 'Window seat', 'v1'));
});
it('edits permitted visit details and submits the session version', async () => {
  const session = { id: 's1', restaurantId: 'r1', guestCount: 2, openedBy: 'u1', waiterId: null, waiterName: null, openedAt: '2026-10-02T10:00:00Z', status: 0, closedAt: null, tableIds: ['t0'], notes: null, createdAtUtc: '', updatedAtUtc: null, cancelledAt: null, closedBy: null, cancelledBy: null, cancellationReason: null, rowVersion: 'version1' };
  vi.mocked(tableApi.getTables).mockResolvedValue([{ ...base, currentStatus: 1 }]);
  vi.mocked(diningSessionApi.list).mockResolvedValue([session]);
  vi.mocked(diningSessionApi.active).mockResolvedValue(session);
  vi.mocked(diningSessionApi.update).mockResolvedValue({ ...session, guestCount: 3, notes: 'Allergy', rowVersion: 'version2' });
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  await user.click(await screen.findByRole('button', { name: 'Edit session' }));
  const guests = screen.getByRole('spinbutton', { name: 'Number of guests' });
  await user.clear(guests); await user.type(guests, '3');
  await user.type(screen.getByRole('textbox', { name: 'Session notes' }), 'Allergy');
  await user.click(screen.getByRole('button', { name: 'Save session' }));
  await waitFor(() => expect(diningSessionApi.update).toHaveBeenCalledWith(session, { guestCount: 3, waiterId: null, notes: 'Allergy' }));
  expect(await screen.findByText('Guests: 3')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Close details' }));
  expect(await screen.findByText(/Session s1 · 3 guests/)).toBeInTheDocument();
});
it('requires a cancellation reason and restricts cancellation to managers', async () => {
  const session = { id: 's1', restaurantId: 'r1', guestCount: 2, openedBy: 'u1', waiterId: null, waiterName: null, openedAt: '2026-10-02T10:00:00Z', status: 0, closedAt: null, tableIds: ['t0'], notes: null, createdAtUtc: '', updatedAtUtc: null, cancelledAt: null, closedBy: null, cancelledBy: null, cancellationReason: null, rowVersion: 'version1' };
  vi.mocked(tableApi.getTables).mockResolvedValue([{ ...base, currentStatus: 1 }]);
  vi.mocked(diningSessionApi.active).mockResolvedValue(session);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  await user.click(await screen.findByRole('button', { name: 'Cancel dining session' }));
  expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: 'Cancellation reason' }), 'Opened in error');
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(diningSessionApi.cancel).toHaveBeenCalledWith('s1', 'version1', 'Opened in error'));
});
it('does not offer opening a table in an inactive area', async () => {
  vi.mocked(areaApi.getAreas).mockResolvedValue([{ id: 'hall', restaurantId: 'r1', name: 'Hall', description: null, displayOrder: 0, isActive: false, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'v1' }]);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  expect(screen.queryByRole('button', { name: 'Open Table' })).not.toBeInTheDocument();
});
it('does not offer cancellation to a waiter', async () => {
  vi.mocked(useAuth).mockReturnValue({ user: { role: 'Waiter' }, hasPermission: (permission: string) => permission === 'orders.create' } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(tableApi.getTables).mockResolvedValue([{ ...base, currentStatus: 1 }]);
  vi.mocked(diningSessionApi.active).mockResolvedValue({ id: 's1', restaurantId: 'r1', guestCount: 2, openedBy: 'u1', waiterId: null, waiterName: null, openedAt: '2026-10-02T10:00:00Z', status: 0, closedAt: null, tableIds: ['t0'], notes: null, createdAtUtc: '', updatedAtUtc: null, cancelledAt: null, closedBy: null, cancelledBy: null, cancellationReason: null, rowVersion: 'version1' });
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  await screen.findByText('Guests: 2');
  expect(screen.queryByRole('button', { name: 'Cancel dining session' })).not.toBeInTheDocument();
});

it('selects multiple tables, validates capacity and displays backend errors', async () => {
  vi.mocked(tableApi.getTables).mockResolvedValue([base, { ...base, id: 't2', tableNumber: '2' }]);
  vi.mocked(diningSessionApi.openCombined).mockRejectedValueOnce(new Error('Table already assigned'));
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Table 1' });
  await user.click(screen.getByRole('button', { name: 'Open dining session / combine tables' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByRole('button', { name: 'Open dining session' })).toBeDisabled();
  await user.click(dialog.getByRole('combobox', { name: 'Session area' }));
  await user.click(screen.getByRole('option', { name: 'Hall' }));
  fireEvent.change(dialog.getByLabelText('Guest count'), { target: { value: '7' } });
  await user.click(dialog.getAllByRole('checkbox')[0]);
  expect(dialog.getByText('Not enough table capacity for 7 guests.')).toBeInTheDocument();
  await user.click(dialog.getAllByRole('checkbox')[1]);
  expect(dialog.getByText('Combined capacity: 8')).toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: 'Open dining session' }));
  expect(await dialog.findByRole('alert')).toHaveTextContent('Table already assigned');
  expect(diningSessionApi.openCombined).toHaveBeenCalledWith('hall', ['t0', 't2'], 7);
  vi.mocked(diningSessionApi.openCombined).mockResolvedValueOnce({} as never);
  await user.click(dialog.getByRole('button', { name: 'Open dining session' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('reloads tables after a failed combine and drops a table that was taken meanwhile', async () => {
  vi.mocked(tableApi.getTables).mockResolvedValueOnce([base, { ...base, id: 't2', tableNumber: '2' }])
    .mockResolvedValue([base, { ...base, id: 't2', tableNumber: '2', currentStatus: 1 }]);
  vi.mocked(diningSessionApi.openCombined).mockRejectedValueOnce(new Error('Table already has an active dining session.')).mockResolvedValueOnce({} as never);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Table 1' });
  await user.click(screen.getByRole('button', { name: 'Open dining session / combine tables' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('combobox', { name: 'Session area' }));
  await user.click(screen.getByRole('option', { name: 'Hall' }));
  await user.click(dialog.getAllByRole('checkbox')[0]);
  await user.click(dialog.getAllByRole('checkbox')[1]);
  await user.click(dialog.getByRole('button', { name: 'Open dining session' }));
  expect(await dialog.findByRole('alert')).toHaveTextContent('Table already has an active dining session.');
  await waitFor(() => expect(dialog.getAllByRole('checkbox')).toHaveLength(1));
  expect(dialog.getByText('Selected tables: 1')).toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: 'Open dining session' }));
  await waitFor(() => expect(diningSessionApi.openCombined).toHaveBeenLastCalledWith('hall', ['t0'], 1));
});

it('lets floor staff mark a cleaned table ready and then open it', async () => {
  vi.mocked(useAuth).mockReturnValue({ user: { role: 'Waiter' }, hasPermission: (permission: string) => permission === 'orders.create' } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(tableApi.getTables).mockResolvedValueOnce([{ ...base, currentStatus: 4 }]).mockResolvedValueOnce([{ ...base, rowVersion: 'v2' }]);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  expect(screen.queryByRole('button', { name: 'Open Table' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Mark table ready' }));
  await waitFor(() => expect(tableApi.markReady).toHaveBeenCalledWith(expect.objectContaining({ id: 't0', rowVersion: 'v1' })));
  expect(await screen.findByText('Status: Available')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Open Table' })).toBeInTheDocument();
});

it('shows why a table could not be marked ready', async () => {
  vi.mocked(tableApi.getTables).mockImplementation(async () => [{ ...base, currentStatus: 4 }]);
  vi.mocked(tableApi.markReady).mockRejectedValue(new Error('The table was changed by another user. Refresh and try again.'));
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Table 1' }));
  await user.click(screen.getByRole('button', { name: 'Mark table ready' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The table was changed by another user.');
  await waitFor(() => expect(tableApi.getTables).toHaveBeenCalledTimes(2));
});

it('refreshes the floor quietly when the window regains focus, but not under an open dialog', async () => {
  vi.mocked(tableApi.getTables).mockResolvedValueOnce([base]).mockResolvedValue([{ ...base, currentStatus: 1 }]);
  const user = userEvent.setup(); render(<MemoryRouter><TableDashboardPage /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Table 1' });
  act(() => { window.dispatchEvent(new Event('focus')); });
  expect(screen.queryByText('Loading table dashboard…')).not.toBeInTheDocument();
  await waitFor(() => expect(within(screen.getByRole('button', { name: 'Table 1' })).getByText('Occupied')).toBeInTheDocument());
  expect(tableApi.getTables).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole('button', { name: 'Table 1' }));
  act(() => { window.dispatchEvent(new Event('focus')); });
  expect(tableApi.getTables).toHaveBeenCalledTimes(2);
});
