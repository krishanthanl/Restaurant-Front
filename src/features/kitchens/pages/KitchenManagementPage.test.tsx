import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KitchenManagementPage } from './KitchenManagementPage';
import { kitchenApi } from '../api/kitchenApi';
import type { Kitchen } from '../types/kitchenTypes';
import { useAuth } from '../../authentication/useAuth';
import { Permissions } from '../../authentication/permissions';

vi.mock('../api/kitchenApi', () => ({ kitchenApi: { getKitchens: vi.fn(), createKitchen: vi.fn(), updateKitchen: vi.fn(), setKitchenStatus: vi.fn() } }));
vi.mock('../../authentication/useAuth', () => ({ useAuth: vi.fn() }));

const hot: Kitchen = {
  id: 'kitchen-1', name: 'Hot Kitchen', code: 'HOT', description: 'Grill and wok', displayOrder: 1, isActive: true, activeMenuItemCount: 4,
  createdAtUtc: '2026-10-18T00:00:00Z', updatedAtUtc: null, rowVersion: 'version-1',
};
const bar: Kitchen = { ...hot, id: 'kitchen-2', name: 'Bar', code: 'BAR', description: null, activeMenuItemCount: 0 };

function grant(...permissions: string[]) {
  vi.mocked(useAuth).mockReturnValue({ hasPermission: (permission: string) => permissions.includes(permission) } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.resetAllMocks();
  grant(Permissions.menuManage);
  vi.mocked(kitchenApi.getKitchens).mockResolvedValue([hot, bar]);
  vi.mocked(kitchenApi.createKitchen).mockResolvedValue(bar);
  vi.mocked(kitchenApi.updateKitchen).mockResolvedValue(hot);
  vi.mocked(kitchenApi.setKitchenStatus).mockResolvedValue(bar);
});
afterEach(cleanup);

describe('Kitchen management', () => {
  it('lists kitchens with their active item counts', async () => {
    render(<KitchenManagementPage />);
    const table = await screen.findByRole('table', { name: 'Kitchens' });
    const hotRow = within(table).getByRole('row', { name: /Hot Kitchen/ });
    expect(within(hotRow).getByText('4')).toBeInTheDocument();
    expect(within(table).getByText('Grill and wok')).toBeInTheDocument();
    expect(within(hotRow).getByText('HOT')).toBeInTheDocument();
    expect(kitchenApi.getKitchens).toHaveBeenCalledWith('all', expect.any(AbortSignal));
  });

  it('validates and creates a kitchen', async () => {
    const user = userEvent.setup();
    render(<KitchenManagementPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Add kitchen' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Create kitchen' }));
    expect(within(dialog).getByText('Kitchen name is required.')).toBeInTheDocument();
    expect(within(dialog).getByText('Kitchen code is required.')).toBeInTheDocument();
    expect(kitchenApi.createKitchen).not.toHaveBeenCalled();
    await user.type(within(dialog).getByRole('textbox', { name: /Kitchen name/ }), ' Pastry ');
    await user.type(within(dialog).getByRole('textbox', { name: /Code/ }), 'pas try');
    await user.click(within(dialog).getByRole('button', { name: 'Create kitchen' }));
    expect(within(dialog).getByText('Use only letters, digits, - and _.')).toBeInTheDocument();
    await user.clear(within(dialog).getByRole('textbox', { name: /Code/ }));
    await user.type(within(dialog).getByRole('textbox', { name: /Code/ }), 'pastry');
    expect(within(dialog).getByRole('textbox', { name: /Code/ })).toHaveValue('PASTRY');
    await user.click(within(dialog).getByRole('button', { name: 'Create kitchen' }));
    await waitFor(() => expect(kitchenApi.createKitchen).toHaveBeenCalledWith({ name: 'Pastry', code: 'PASTRY', description: '', displayOrder: 0, isActive: true }));
    expect(await screen.findByText('Kitchen created.')).toBeInTheDocument();
  });

  it('warns before deactivating a kitchen that still has active items and shows the server conflict', async () => {
    const user = userEvent.setup();
    vi.mocked(kitchenApi.setKitchenStatus).mockRejectedValueOnce(new Error('This kitchen prepares 4 active menu item(s).'));
    render(<KitchenManagementPage />);
    await user.click(await screen.findByRole('button', { name: 'Deactivate Hot Kitchen' }));
    expect(within(screen.getByRole('dialog')).getByText(/still prepares 4 active menu item/)).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(kitchenApi.setKitchenStatus).toHaveBeenCalledWith(hot, false));
    expect(await screen.findByText('This kitchen prepares 4 active menu item(s).')).toBeInTheDocument();
    // The list reloads so a retry uses fresh data rather than the stale row version.
    await waitFor(() => expect(kitchenApi.getKitchens).toHaveBeenCalledTimes(2));
  });

  it('edits a kitchen with its current details', async () => {
    const user = userEvent.setup();
    render(<KitchenManagementPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit Bar' }));
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByRole('textbox', { name: /Kitchen name/ }));
    await user.type(within(dialog).getByRole('textbox', { name: /Kitchen name/ }), 'Drinks');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(kitchenApi.updateKitchen).toHaveBeenCalledWith(bar, { name: 'Drinks', code: 'BAR', description: '', displayOrder: 1, isActive: true }));
  });

  it('shows a load failure and retries', async () => {
    const user = userEvent.setup();
    vi.mocked(kitchenApi.getKitchens).mockRejectedValueOnce(new Error('Could not connect to the server.'));
    render(<KitchenManagementPage />);
    expect(await screen.findByText('Could not connect to the server.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: 'Kitchens' })).toBeInTheDocument();
    expect(kitchenApi.getKitchens).toHaveBeenCalledTimes(2);
  });

  it('submits once while a save is pending and keeps the dialog open when it fails', async () => {
    const user = userEvent.setup();
    let rejectCreate: (reason: unknown) => void = () => undefined;
    vi.mocked(kitchenApi.createKitchen).mockReturnValueOnce(new Promise((_, reject) => { rejectCreate = reject; }));
    render(<KitchenManagementPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Add kitchen' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: /Kitchen name/ }), 'Bar');
    await user.type(within(dialog).getByRole('textbox', { name: /Code/ }), 'BAR');
    const create = within(dialog).getByRole('button', { name: 'Create kitchen' });
    // Two clicks in one act land before React re-renders the button as disabled.
    act(() => { create.click(); create.click(); });
    expect(create).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: /Kitchen name/ })).toBeDisabled();
    expect(kitchenApi.createKitchen).toHaveBeenCalledTimes(1);
    rejectCreate(new Error('A kitchen with this code already exists in this restaurant.'));
    expect(await screen.findByText('A kitchen with this code already exists in this restaurant.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create kitchen' })).toBeEnabled();
  });

  it('activates an inactive kitchen and reloads the list', async () => {
    const user = userEvent.setup();
    const pastry: Kitchen = { ...bar, id: 'kitchen-3', name: 'Pastry', code: 'PAS', isActive: false };
    vi.mocked(kitchenApi.getKitchens).mockResolvedValue([hot, pastry]);
    render(<KitchenManagementPage />);
    await user.click(await screen.findByRole('button', { name: 'Activate Pastry' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(kitchenApi.setKitchenStatus).toHaveBeenCalledWith(pastry, true));
    expect(await screen.findByText('Kitchen activated.')).toBeInTheDocument();
    await waitFor(() => expect(kitchenApi.getKitchens).toHaveBeenCalledTimes(2));
  });

  it('hides management actions without menu.manage', async () => {
    grant();
    render(<KitchenManagementPage />);
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Add kitchen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Bar' })).not.toBeInTheDocument();
  });
});
