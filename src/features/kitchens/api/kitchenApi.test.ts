import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/apiClient';
import { kitchenApi } from './kitchenApi';
import type { Kitchen } from '../types/kitchenTypes';

const kitchen: Kitchen = {
  id: 'kitchen-1', name: 'Hot Kitchen', code: 'HOT', description: null, displayOrder: 1, isActive: true, activeMenuItemCount: 0,
  createdAtUtc: '2026-10-18T00:00:00Z', updatedAtUtc: null, rowVersion: 'AAAAAAAAB9E=',
};

afterEach(() => vi.restoreAllMocks());

describe('kitchenApi', () => {
  it('maps the status filter to the list query and passes the abort signal', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [kitchen] });
    const signal = new AbortController().signal;
    await expect(kitchenApi.getKitchens('all', signal)).resolves.toEqual([kitchen]);
    expect(get).toHaveBeenLastCalledWith('/kitchens', { params: { includeInactive: true, isActive: undefined }, signal });
    await kitchenApi.getKitchens('inactive');
    expect(get).toHaveBeenLastCalledWith('/kitchens', { params: { includeInactive: false, isActive: false }, signal: undefined });
  });

  it('creates a kitchen, sending an empty description as null', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: kitchen });
    await kitchenApi.createKitchen({ name: 'Hot Kitchen', code: 'HOT', description: '', displayOrder: 1, isActive: true });
    expect(post).toHaveBeenCalledWith('/kitchens', { name: 'Hot Kitchen', code: 'HOT', description: null, displayOrder: 1, isActive: true });
  });

  it('sends the row version with updates and status changes', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: kitchen });
    await kitchenApi.updateKitchen(kitchen, { name: 'Grill', code: 'GRILL', description: 'Charcoal', displayOrder: 2, isActive: true });
    expect(put).toHaveBeenLastCalledWith('/kitchens/kitchen-1',
      { name: 'Grill', code: 'GRILL', description: 'Charcoal', displayOrder: 2, rowVersion: 'AAAAAAAAB9E=' });
    await kitchenApi.setKitchenStatus(kitchen, false);
    expect(put).toHaveBeenLastCalledWith('/kitchens/kitchen-1/deactivate', { rowVersion: 'AAAAAAAAB9E=' });
    await kitchenApi.setKitchenStatus(kitchen, true);
    expect(put).toHaveBeenLastCalledWith('/kitchens/kitchen-1/activate', { rowVersion: 'AAAAAAAAB9E=' });
  });
});
