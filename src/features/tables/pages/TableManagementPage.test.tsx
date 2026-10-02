import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TableManagementPage } from './TableManagementPage';
import { tableApi } from '../api/tableApi';
import { areaApi } from '../../areas/api/areaApi';
import { useAuth } from '../../authentication/useAuth';
import type { RestaurantTable } from '../types/tableTypes';
vi.mock('../api/tableApi', () => ({ tableApi: { getTables: vi.fn(), createTable: vi.fn(), updateTable: vi.fn(), setTableStatus: vi.fn() } }));
vi.mock('../../areas/api/areaApi', () => ({ areaApi: { getAreas: vi.fn() } }));
vi.mock('../../authentication/useAuth', () => ({ useAuth: vi.fn() }));
const table: RestaurantTable = { id: 't1', restaurantId: 'r1', areaId: 'a1', tableNumber: 'T1', name: null, capacity: 4, tableType: 1, displayOrder: 0, isActive: true, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'v1' };
beforeEach(() => {
 vi.resetAllMocks();
 vi.mocked(useAuth).mockReturnValue({ user: { role: 'Manager' } } as ReturnType<typeof useAuth>);
 vi.mocked(tableApi.getTables).mockResolvedValue([table]);
 vi.mocked(areaApi.getAreas).mockResolvedValue([{ id: 'a1', restaurantId: 'r1', name: 'Hall', description: null, displayOrder: 0, isActive: true, createdAtUtc: '', updatedAtUtc: null, rowVersion: 'v1' }]);
 vi.mocked(tableApi.createTable).mockResolvedValue(table); vi.mocked(tableApi.updateTable).mockResolvedValue(table); vi.mocked(tableApi.setTableStatus).mockResolvedValue(table);
});
afterEach(cleanup);
it('renders details and filters by area', async () => {
 const user = userEvent.setup(); render(<TableManagementPage />);
 const list = await screen.findByRole('table'); expect(within(list).getByText('Hall')).toBeInTheDocument(); expect(within(list).getByText('Booth')).toBeInTheDocument();
 await user.click(screen.getByRole('combobox', { name: 'Area' })); await user.click(screen.getByRole('option', { name: 'Hall' }));
 await waitFor(() => expect(tableApi.getTables).toHaveBeenLastCalledWith('all', 'a1', expect.any(AbortSignal)));
});
it('validates and creates a table', async () => {
 const user = userEvent.setup(); render(<TableManagementPage />); await screen.findByRole('table');
 await user.click(screen.getByRole('button', { name: 'Add table' })); const dialog = within(screen.getByRole('dialog'));
 await user.click(dialog.getByRole('button', { name: 'Create table' })); expect(tableApi.createTable).not.toHaveBeenCalled();
 await user.type(dialog.getByRole('textbox', { name: /Table number/ }), ' T2 ');
 await user.click(dialog.getByRole('combobox', { name: /Area/ })); await user.click(screen.getByRole('option', { name: 'Hall' }));
 await user.clear(dialog.getByRole('spinbutton', { name: /Capacity/ })); await user.type(dialog.getByRole('spinbutton', { name: /Capacity/ }), '0');
 await user.click(dialog.getByRole('button', { name: 'Create table' })); expect(dialog.getByText('Capacity must be a positive whole number.')).toBeInTheDocument();
 await user.clear(dialog.getByRole('spinbutton', { name: /Capacity/ })); await user.type(dialog.getByRole('spinbutton', { name: /Capacity/ }), '6');
 await user.click(dialog.getByRole('button', { name: 'Create table' }));
 await waitFor(() => expect(tableApi.createTable).toHaveBeenCalledWith({ areaId: 'a1', tableNumber: 'T2', name: '', capacity: 6, tableType: 0, displayOrder: 0, isActive: true }));
});
it('edits and confirms deactivation', async () => {
 const user = userEvent.setup(); render(<TableManagementPage />);
 await user.click(await screen.findByRole('button', { name: 'Edit T1' }));
 await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save changes' }));
 await waitFor(() => expect(tableApi.updateTable).toHaveBeenCalledWith(table, expect.objectContaining({ capacity: 4, areaId: 'a1' })));
 await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 await user.click(screen.getByRole('button', { name: 'Deactivate T1' })); expect(tableApi.setTableStatus).not.toHaveBeenCalled();
 await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' })); await waitFor(() => expect(tableApi.setTableStatus).toHaveBeenCalledWith(table, false));
});
it('hides mutation controls for waiters', async () => {
 vi.mocked(useAuth).mockReturnValue({ user: { role: 'Waiter' } } as ReturnType<typeof useAuth>);
 render(<TableManagementPage />); await screen.findByRole('table'); expect(screen.queryByRole('button', { name: 'Add table' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Edit T1' })).not.toBeInTheDocument();
});
