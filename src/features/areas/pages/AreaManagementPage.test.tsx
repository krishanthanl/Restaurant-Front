import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AreaManagementPage } from './AreaManagementPage';
import { areaApi } from '../api/areaApi';
import type { Area } from '../types/areaTypes';

vi.mock('../api/areaApi', () => ({ areaApi: { getAreas: vi.fn(), createArea: vi.fn(), updateArea: vi.fn(), setAreaStatus: vi.fn() } }));

const hall: Area = {
  id: 'area-1', restaurantId: 'restaurant-1', name: 'Main Hall', description: 'Ground floor', displayOrder: 2,
  isActive: true, createdAtUtc: '2026-09-27T00:00:00Z', updatedAtUtc: null, rowVersion: 'version-1',
};
const outdoor: Area = { ...hall, id: 'area-2', name: 'Outdoor', description: null, isActive: false };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(areaApi.getAreas).mockImplementation(async (filter) => filter === 'active' ? [hall] : filter === 'inactive' ? [outdoor] : [hall, outdoor]);
  vi.mocked(areaApi.createArea).mockResolvedValue(hall);
  vi.mocked(areaApi.updateArea).mockResolvedValue(hall);
  vi.mocked(areaApi.setAreaStatus).mockResolvedValue(hall);
});
afterEach(cleanup);

describe('Area management', () => {
  it('renders the area list and changes status filters', async () => {
    const user = userEvent.setup();
    render(<AreaManagementPage />);
    const table = await screen.findByRole('table', { name: 'Restaurant areas' });
    expect(within(table).getByText('Main Hall')).toBeInTheDocument();
    expect(within(table).getByText('Ground floor')).toBeInTheDocument();
    expect(within(table).getAllByText('2', { selector: 'td' })).toHaveLength(2);
    expect(within(table).getByText('Inactive')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(screen.getByRole('option', { name: 'Active' }));
    await waitFor(() => expect(areaApi.getAreas).toHaveBeenLastCalledWith('active', expect.any(AbortSignal)));
    await waitFor(() => expect(screen.queryByText('Outdoor')).not.toBeInTheDocument());
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(screen.getByRole('option', { name: 'Inactive' }));
    await screen.findByText('Outdoor');
    expect(screen.queryByText('Main Hall')).not.toBeInTheDocument();
  });

  it('validates add-area fields before sending and submits valid details', async () => {
    const user = userEvent.setup();
    render(<AreaManagementPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Add area' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Create area' }));
    expect(within(dialog).getByText('Area name is required.')).toBeInTheDocument();
    expect(areaApi.createArea).not.toHaveBeenCalled();
    await user.type(within(dialog).getByRole('textbox', { name: /Area name/ }), ' VIP ');
    await user.clear(within(dialog).getByRole('spinbutton', { name: 'Display order' }));
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Display order' }), '-1');
    await user.click(within(dialog).getByRole('button', { name: 'Create area' }));
    expect(within(dialog).getByText(/Display order must be a whole number/)).toBeInTheDocument();
    expect(areaApi.createArea).not.toHaveBeenCalled();
    await user.clear(within(dialog).getByRole('spinbutton', { name: 'Display order' }));
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Display order' }), '3');
    await user.type(within(dialog).getByRole('textbox', { name: 'Description' }), ' Private dining ');
    await user.click(within(dialog).getByRole('button', { name: 'Create area' }));
    await waitFor(() => expect(areaApi.createArea).toHaveBeenCalledWith({ name: 'VIP', description: 'Private dining', displayOrder: 3, isActive: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Area created.')).toBeInTheDocument();
  });

  it('edits area details with the current row version', async () => {
    const user = userEvent.setup();
    render(<AreaManagementPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit Main Hall' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: /Area name/ })).toHaveValue('Main Hall');
    expect(within(dialog).queryByRole('switch')).not.toBeInTheDocument();
    await user.clear(within(dialog).getByRole('textbox', { name: /Area name/ }));
    await user.type(within(dialog).getByRole('textbox', { name: /Area name/ }), 'Upstairs');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(areaApi.updateArea).toHaveBeenCalledWith(hall, { name: 'Upstairs', description: 'Ground floor', displayOrder: 2, isActive: true }));
  });

  it('confirms status changes and allows cancellation', async () => {
    const user = userEvent.setup();
    render(<AreaManagementPage />);
    await user.click(await screen.findByRole('button', { name: 'Deactivate Main Hall' }));
    expect(areaApi.setAreaStatus).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(areaApi.setAreaStatus).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Deactivate Main Hall' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(areaApi.setAreaStatus).toHaveBeenCalledWith(hall, false));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(await screen.findByRole('button', { name: 'Activate Outdoor' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(areaApi.setAreaStatus).toHaveBeenCalledWith(outdoor, true));
  });

  it('shows load errors and retries', async () => {
    const user = userEvent.setup();
    vi.mocked(areaApi.getAreas).mockRejectedValueOnce(new Error('Access denied'));
    render(<AreaManagementPage />);
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('keeps the edit form open when saving fails', async () => {
    const user = userEvent.setup();
    vi.mocked(areaApi.updateArea).mockRejectedValueOnce(new Error('Refresh and try again.'));
    render(<AreaManagementPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit Main Hall' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Refresh and try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
