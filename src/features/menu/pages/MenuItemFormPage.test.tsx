import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuItemFormPage } from './MenuItemFormPage';
import { menuApi } from '../api/menuApi';
import { kitchenApi } from '../../kitchens/api/kitchenApi';
import type { MenuCategory, MenuItem } from '../types/menuTypes';
import type { Kitchen } from '../../kitchens/types/kitchenTypes';

vi.mock('../api/menuApi', () => ({ menuApi: { getCategories: vi.fn(), getItem: vi.fn(), createItem: vi.fn(), updateItem: vi.fn() } }));
vi.mock('../../kitchens/api/kitchenApi', () => ({ kitchenApi: { getKitchens: vi.fn() } }));

const category: MenuCategory = {
  id: 'category-1', name: 'Mains', description: null, imagePath: null, displayOrder: 0, isActive: true, itemCount: 0,
  createdAtUtc: '2026-10-18T00:00:00Z', updatedAtUtc: null, rowVersion: 'c1',
};
const hot: Kitchen = {
  id: 'kitchen-1', name: 'Hot Kitchen', code: 'HOT', description: null, displayOrder: 0, isActive: true, activeMenuItemCount: 1,
  createdAtUtc: '2026-10-18T00:00:00Z', updatedAtUtc: null, rowVersion: 'k1',
};
const bar: Kitchen = { ...hot, id: 'kitchen-2', name: 'Bar', code: 'BAR' };
const retired: Kitchen = { ...hot, id: 'kitchen-3', name: 'Old Grill', code: 'OLD', isActive: false };
const item: MenuItem = {
  id: 'item-1', name: 'Kottu', description: null, price: 1200, imagePath: null, isActive: true, isAvailable: true, isOrderable: true,
  categoryId: category.id, categoryName: category.name, kitchenId: hot.id, kitchenName: hot.name, isKitchenActive: true,
  createdAtUtc: '2026-10-18T00:00:00Z', updatedAtUtc: null, rowVersion: 'i1',
};

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/menu/items/new" element={<MenuItemFormPage />} />
    <Route path="/menu/items/:id/edit" element={<MenuItemFormPage />} />
    <Route path="/menu/items" element={<p>Item list</p>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(menuApi.getCategories).mockResolvedValue([category]);
  vi.mocked(kitchenApi.getKitchens).mockResolvedValue([hot, bar, retired]);
  vi.mocked(menuApi.getItem).mockResolvedValue(item);
  vi.mocked(menuApi.createItem).mockResolvedValue(item);
  vi.mocked(menuApi.updateItem).mockResolvedValue(item);
});
afterEach(cleanup);

describe('Menu item kitchen assignment', () => {
  it('shows the server message when the backend rejects the kitchen', async () => {
    const user = userEvent.setup();
    vi.mocked(menuApi.updateItem).mockRejectedValueOnce(new Error('Menu items can only be assigned to active kitchens.'));
    renderAt('/menu/items/item-1/edit');
    await user.click(await screen.findByRole('combobox', { name: 'Kitchen' }));
    await user.click(screen.getByRole('option', { name: 'Bar' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Menu items can only be assigned to active kitchens.')).toBeInTheDocument();
    expect(screen.queryByText('Item list')).not.toBeInTheDocument();
  });

  it('warns when the item is still assigned to an inactive kitchen', async () => {
    vi.mocked(menuApi.getItem).mockResolvedValue({ ...item, isActive: false, isOrderable: false, kitchenId: retired.id, kitchenName: retired.name, isKitchenActive: false });
    renderAt('/menu/items/item-1/edit');
    expect(await screen.findByText('This kitchen is inactive, so the item cannot be ordered. Choose an active kitchen.')).toBeInTheDocument();
  });

  it('requires a kitchen and offers only active kitchens when creating', async () => {
    const user = userEvent.setup();
    renderAt('/menu/items/new');
    await user.type(await screen.findByRole('textbox', { name: 'Item name' }), 'Tea');
    await user.type(screen.getByRole('textbox', { name: 'Price' }), '150');
    await user.click(screen.getByRole('button', { name: 'Create item' }));
    expect(screen.getByText('Choose a kitchen.')).toBeInTheDocument();
    expect(menuApi.createItem).not.toHaveBeenCalled();

    await user.click(screen.getByRole('combobox', { name: 'Kitchen' }));
    const options = within(screen.getByRole('listbox'));
    expect(options.getByRole('option', { name: 'Hot Kitchen' })).toBeInTheDocument();
    expect(options.queryByRole('option', { name: /Old Grill/ })).not.toBeInTheDocument();
    await user.click(options.getByRole('option', { name: 'Bar' }));
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Mains' }));
    await user.click(screen.getByRole('button', { name: 'Create item' }));
    await waitFor(() => expect(menuApi.createItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tea', categoryId: 'category-1', kitchenId: 'kitchen-2' })));
  });

  it('preselects the only active kitchen', async () => {
    vi.mocked(kitchenApi.getKitchens).mockResolvedValue([hot, retired]);
    renderAt('/menu/items/new');
    expect(await screen.findByRole('combobox', { name: 'Kitchen' })).toHaveTextContent('Hot Kitchen');
  });

  it('blocks creation and links to kitchen setup when no kitchen is active', async () => {
    vi.mocked(kitchenApi.getKitchens).mockResolvedValue([retired]);
    renderAt('/menu/items/new');
    expect(await screen.findByText('Create and activate a kitchen before adding menu items.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create item' })).toBeDisabled();
  });

  it('loads and submits the current kitchen when editing', async () => {
    const user = userEvent.setup();
    renderAt('/menu/items/item-1/edit');
    expect(await screen.findByRole('combobox', { name: 'Kitchen' })).toHaveTextContent('Hot Kitchen');
    await user.click(screen.getByRole('combobox', { name: 'Kitchen' }));
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Bar' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(menuApi.updateItem).toHaveBeenCalledWith('item-1', expect.objectContaining({ kitchenId: 'kitchen-2' }), 'i1'));
    expect(await screen.findByText('Item list')).toBeInTheDocument();
  });
});
