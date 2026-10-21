import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/apiClient';
import { menuApi } from './menuApi';
import type { MenuItem } from '../types/menuTypes';

const item = { id: 'item-1', rowVersion: 'AAAAAAAAB9E=' } as MenuItem;

afterEach(() => vi.restoreAllMocks());

describe('menuApi kitchen assignment', () => {
  it('reads and assigns an item kitchen, sending the item row version', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: {} });
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await menuApi.getItemKitchen('item-1');
    expect(get).toHaveBeenCalledWith('/menu-items/item-1/kitchen');
    await menuApi.assignItemKitchen(item, 'kitchen-2');
    expect(put).toHaveBeenCalledWith('/menu-items/item-1/kitchen', { kitchenId: 'kitchen-2', rowVersion: 'AAAAAAAAB9E=' });
  });

  it('passes the needs-kitchen filter to the item list', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { items: [], page: 1, pageSize: 1, totalCount: 0 } });
    await menuApi.getItems({ page: 1, pageSize: 1, isKitchenActive: false });
    expect(get).toHaveBeenCalledWith('/menu-items', { params: expect.objectContaining({ isKitchenActive: false, kitchenId: undefined }) });
  });
});
