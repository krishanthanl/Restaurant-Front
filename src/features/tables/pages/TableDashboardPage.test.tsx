import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TableDashboardPage } from './TableDashboardPage';
import { tableApi } from '../api/tableApi';
import { areaApi } from '../../areas/api/areaApi';
import { useAuth } from '../../authentication/useAuth';
import type { RestaurantTable } from '../types/tableTypes';

vi.mock('../api/tableApi', () => ({ tableApi: { getTables: vi.fn() } }));
vi.mock('../../areas/api/areaApi', () => ({ areaApi: { getAreas: vi.fn() } }));
vi.mock('../../authentication/useAuth', () => ({ useAuth: vi.fn() }));
const base: RestaurantTable = { id: 't0', restaurantId: 'r1', areaId: 'hall', tableNumber: '1', name: null, capacity: 4, tableType: 0, displayOrder: 0, isActive: true, currentStatus: 0, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'v1' };
const tables = Array.from({ length: 6 }, (_, index) => ({ ...base, id: `t${index}`, tableNumber: String(index + 1), areaId: index === 1 ? 'patio' : 'hall', currentStatus: index }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { role: 'Manager' } } as ReturnType<typeof useAuth>);
  vi.mocked(tableApi.getTables).mockResolvedValue([...tables, { ...base, id: 'inactive', tableNumber: '7', isActive: false }]);
  vi.mocked(areaApi.getAreas).mockResolvedValue(['hall', 'patio'].map((id, index) => ({ id, restaurantId: 'r1', name: id === 'hall' ? 'Hall' : 'Patio', description: null, displayOrder: index, isActive: true, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'v1' })));
});
afterEach(cleanup);

it('groups tables by area and counts active operational statuses separately from total tables', async () => {
  render(<TableDashboardPage />);
  const summary = within(await screen.findByRole('region', { name: 'Table summary' }));
  expect(summary.getByText('7')).toBeInTheDocument();
  expect(summary.getAllByText('1')).toHaveLength(5);
  expect(within(screen.getByRole('region', { name: 'Patio' })).getByRole('button', { name: 'Table 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Table 7, inactive' })).toBeDisabled();
});

it('opens active table details and prevents inactive tables from opening', async () => {
  const user = userEvent.setup(); render(<TableDashboardPage />);
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
  const user = userEvent.setup(); render(<TableDashboardPage />); await screen.findByRole('button', { name: 'Table 1' });
  await user.click(screen.getByRole('combobox', { name: 'Area' })); await user.click(screen.getByRole('option', { name: 'Patio' }));
  expect(screen.queryByRole('button', { name: 'Table 1' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: 'Operational status' })); await user.click(screen.getByRole('option', { name: 'Available' }));
  expect(screen.getByText('No matching tables')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Table summary' })).getAllByText('1')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole('button', { name: 'Table 1' })).toBeInTheDocument();
});

it('refreshes information and uses the active-only API for waiters', async () => {
  vi.mocked(useAuth).mockReturnValue({ user: { role: 'Waiter' } } as ReturnType<typeof useAuth>);
  vi.mocked(tableApi.getTables).mockResolvedValueOnce([base]).mockResolvedValueOnce([{ ...base, currentStatus: 4 }]);
  const user = userEvent.setup(); render(<TableDashboardPage />); await screen.findByRole('button', { name: 'Table 1' });
  expect(tableApi.getTables).toHaveBeenCalledWith('active', undefined, expect.any(AbortSignal));
  await user.click(screen.getByRole('button', { name: 'Refresh tables' }));
  await waitFor(() => expect(within(screen.getByRole('button', { name: 'Table 1' })).getByText('Cleaning')).toBeInTheDocument());
  expect(areaApi.getAreas).toHaveBeenCalledTimes(2);
});

it('shows load errors and retries', async () => {
  vi.mocked(tableApi.getTables).mockRejectedValueOnce(new Error('Unable to load tables'));
  const user = userEvent.setup(); render(<TableDashboardPage />);
  expect(await screen.findByText('Unable to load tables')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Table summary' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('button', { name: 'Table 1' });
});

it('handles an empty restaurant', async () => {
  vi.mocked(tableApi.getTables).mockResolvedValue([]);
  render(<TableDashboardPage />);
  expect(await screen.findByText('No tables yet')).toBeInTheDocument();
});
