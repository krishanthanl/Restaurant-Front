import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuItemsPage } from './MenuItemsPage';
import { menuApi } from '../api/menuApi';
import { kitchenApi } from '../../kitchens/api/kitchenApi';
import { useAuth } from '../../authentication/useAuth';
import { Permissions } from '../../authentication/permissions';
import type { MenuItem, MenuItemQuery } from '../types/menuTypes';
import type { Kitchen } from '../../kitchens/types/kitchenTypes';

vi.mock('../api/menuApi', () => ({ menuApi: { getCategories: vi.fn(), getItems: vi.fn(), getItem: vi.fn(), assignItemKitchen: vi.fn(), setItemStatus: vi.fn(), setItemAvailability: vi.fn() } }));
vi.mock('../../kitchens/api/kitchenApi', () => ({ kitchenApi: { getKitchens: vi.fn() } }));
vi.mock('../../authentication/useAuth', () => ({ useAuth: vi.fn() }));

const hot: Kitchen = {
  id: 'kitchen-1', name: 'Hot Kitchen', code: 'HOT', description: null, displayOrder: 0, isActive: true, activeMenuItemCount: 1,
  createdAtUtc: '2026-10-18T00:00:00Z', updatedAtUtc: null, rowVersion: 'k1',
};
const bar: Kitchen = { ...hot, id: 'kitchen-2', name: 'Bar', code: 'BAR' };
const retired: Kitchen = { ...hot, id: 'kitchen-3', name: 'Old Grill', code: 'OLD', isActive: false, activeMenuItemCount: 0 };
const kottu: MenuItem = {
  id: 'item-1', name: 'Kottu', description: null, price: 1200, imagePath: null, isActive: true, isAvailable: true, isOrderable: true,
  categoryId: 'category-1', categoryName: 'Mains', kitchenId: hot.id, kitchenName: hot.name, isKitchenActive: true,
  createdAtUtc: '2026-10-18T00:00:00Z', updatedAtUtc: null, rowVersion: 'i1',
};
const satay: MenuItem = { ...kottu, id: 'item-2', name: 'Satay', isActive: false, isOrderable: false, kitchenId: retired.id, kitchenName: retired.name, isKitchenActive: false, rowVersion: 'i2' };

const isCountQuery = (query: MenuItemQuery) => query.pageSize === 1 && query.isKitchenActive === false;

function grant(...permissions: string[]) {
  vi.mocked(useAuth).mockReturnValue({ hasPermission: (permission: string) => permissions.includes(permission) } as unknown as ReturnType<typeof useAuth>);
}

function renderPage() {
  return render(<MemoryRouter><MenuItemsPage /></MemoryRouter>);
}

async function openKitchenDialog(user: ReturnType<typeof userEvent.setup>, itemName: string) {
  await user.click(await screen.findByRole('button', { name: `Change kitchen for ${itemName}` }));
  return screen.getByRole('dialog', { name: 'Change kitchen' });
}

beforeEach(() => {
  vi.resetAllMocks();
  grant(Permissions.menuManage);
  vi.mocked(menuApi.getCategories).mockResolvedValue([]);
  vi.mocked(kitchenApi.getKitchens).mockResolvedValue([hot, bar, retired]);
  vi.mocked(menuApi.getItems).mockImplementation(async (query) => isCountQuery(query)
    ? { items: [satay], page: 1, pageSize: 1, totalCount: 1 }
    : { items: [kottu, satay], page: 1, pageSize: 10, totalCount: 2 });
  vi.mocked(menuApi.assignItemKitchen).mockResolvedValue({
    menuItemId: kottu.id, kitchenId: bar.id, kitchenName: bar.name, kitchenCode: bar.code, isKitchenActive: true, isOrderable: true, menuItemRowVersion: 'i1b',
  });
});
afterEach(cleanup);

describe('Menu item kitchen assignment', () => {
  it('shows each item kitchen and flags items without an active kitchen', async () => {
    const user = userEvent.setup();
    renderPage();
    const table = await screen.findByRole('table', { name: 'Menu items' });
    expect(within(within(table).getByRole('row', { name: /Kottu/ })).getByText('Hot Kitchen')).toBeInTheDocument();
    const stranded = within(table).getByRole('row', { name: /Satay/ });
    expect(within(stranded).getByText('Old Grill')).toBeInTheDocument();
    expect(within(stranded).getByText('Kitchen inactive')).toBeInTheDocument();

    expect(await screen.findByText(/1 menu item has no active kitchen/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show items' }));
    await waitFor(() => expect(menuApi.getItems).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 10, isKitchenActive: false })));
    expect(menuApi.getItems).toHaveBeenLastCalledWith(expect.not.objectContaining({ kitchenId: expect.anything() }));
  });

  it('changes an assignment to another active kitchen and refreshes the list', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openKitchenDialog(user, 'Kottu');
    await user.click(within(dialog).getByRole('combobox', { name: 'Kitchen' }));
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Hot Kitchen (HOT)', 'Bar (BAR)']);
    await user.click(screen.getByRole('option', { name: 'Bar (BAR)' }));
    const listCalls = vi.mocked(menuApi.getItems).mock.calls.length;
    await user.click(within(dialog).getByRole('button', { name: 'Save kitchen' }));

    await waitFor(() => expect(menuApi.assignItemKitchen).toHaveBeenCalledWith(kottu, bar.id));
    expect(await screen.findByText('Kottu is now prepared in Bar.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Both the list and the needs-kitchen count are reloaded.
    expect(vi.mocked(menuApi.getItems).mock.calls.length).toBeGreaterThanOrEqual(listCalls + 2);
  });

  it('assigns a kitchen to an item stranded on an inactive kitchen, validating the choice first', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openKitchenDialog(user, 'Satay');
    expect(within(dialog).getByText(/Currently assigned to Old Grill, which is inactive/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save kitchen' }));
    expect(within(dialog).getByText('Choose a kitchen.')).toBeInTheDocument();
    expect(menuApi.assignItemKitchen).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('combobox', { name: 'Kitchen' }));
    await user.click(screen.getByRole('option', { name: 'Hot Kitchen (HOT)' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save kitchen' }));
    await waitFor(() => expect(menuApi.assignItemKitchen).toHaveBeenCalledWith(satay, hot.id));
  });

  it('rejects re-selecting the current kitchen without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openKitchenDialog(user, 'Kottu');
    await user.click(within(dialog).getByRole('button', { name: 'Save kitchen' }));
    expect(within(dialog).getByText('Kottu is already prepared in Hot Kitchen.')).toBeInTheDocument();
    expect(menuApi.assignItemKitchen).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with the server error and refreshes the item for a retry', async () => {
    const user = userEvent.setup();
    vi.mocked(menuApi.assignItemKitchen).mockRejectedValueOnce(new Error('The menu item was changed by another user. Refresh and try again.'));
    vi.mocked(menuApi.getItem).mockResolvedValue({ ...kottu, rowVersion: 'fresh' });
    renderPage();
    const dialog = await openKitchenDialog(user, 'Kottu');
    await user.click(within(dialog).getByRole('combobox', { name: 'Kitchen' }));
    await user.click(screen.getByRole('option', { name: 'Bar (BAR)' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save kitchen' }));

    expect(await screen.findByText('The menu item was changed by another user. Refresh and try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Change kitchen' })).toBeInTheDocument();
    await waitFor(() => expect(menuApi.getItem).toHaveBeenCalledWith(kottu.id));

    await user.click(within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Kitchen' }));
    await user.click(screen.getByRole('option', { name: 'Bar (BAR)' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save kitchen' }));
    await waitFor(() => expect(menuApi.assignItemKitchen).toHaveBeenLastCalledWith(expect.objectContaining({ rowVersion: 'fresh' }), bar.id));
  });

  it('sends one request when Save is clicked twice before re-rendering', async () => {
    const user = userEvent.setup();
    let resolveAssign: (value: Awaited<ReturnType<typeof menuApi.assignItemKitchen>>) => void = () => undefined;
    vi.mocked(menuApi.assignItemKitchen).mockReturnValueOnce(new Promise((resolve) => { resolveAssign = resolve; }));
    renderPage();
    const dialog = await openKitchenDialog(user, 'Kottu');
    await user.click(within(dialog).getByRole('combobox', { name: 'Kitchen' }));
    await user.click(screen.getByRole('option', { name: 'Bar (BAR)' }));
    const save = within(dialog).getByRole('button', { name: 'Save kitchen' });
    act(() => { save.click(); save.click(); });
    expect(save).toBeDisabled();
    expect(menuApi.assignItemKitchen).toHaveBeenCalledTimes(1);
    await act(async () => resolveAssign({ menuItemId: kottu.id, kitchenId: bar.id, kitchenName: bar.name, kitchenCode: bar.code, isKitchenActive: true, isOrderable: true, menuItemRowVersion: 'x' }));
  });

  it('explains and blocks assignment when no kitchen is active', async () => {
    const user = userEvent.setup();
    vi.mocked(kitchenApi.getKitchens).mockResolvedValue([retired]);
    renderPage();
    const dialog = await openKitchenDialog(user, 'Satay');
    expect(within(dialog).getByText(/There are no active kitchens/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save kitchen' })).toBeDisabled();
  });

  it('hides kitchen changes without menu.manage', async () => {
    grant();
    renderPage();
    await screen.findByRole('table', { name: 'Menu items' });
    expect(screen.queryByRole('button', { name: /Change kitchen for/ })).not.toBeInTheDocument();
  });
});
