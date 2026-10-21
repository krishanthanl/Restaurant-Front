import { apiClient } from '../../../services/apiClient';
import type { Kitchen, KitchenFilter, KitchenInput } from '../types/kitchenTypes';

export const kitchenApi = {
  async getKitchens(filter: KitchenFilter = 'active', signal?: AbortSignal) {
    const { data } = await apiClient.get<Kitchen[]>('/kitchens', {
      params: { includeInactive: filter === 'all', isActive: filter === 'all' ? undefined : filter === 'active' }, signal,
    });
    return data;
  },
  async createKitchen(input: KitchenInput) {
    const { data } = await apiClient.post<Kitchen>('/kitchens', { ...input, description: input.description || null });
    return data;
  },
  async updateKitchen(kitchen: Kitchen, input: KitchenInput) {
    const { data } = await apiClient.put<Kitchen>(`/kitchens/${kitchen.id}`, {
      name: input.name, code: input.code, description: input.description || null, displayOrder: input.displayOrder, rowVersion: kitchen.rowVersion,
    });
    return data;
  },
  async setKitchenStatus(kitchen: Kitchen, isActive: boolean) {
    const { data } = await apiClient.put<Kitchen>(`/kitchens/${kitchen.id}/${isActive ? 'activate' : 'deactivate'}`, { rowVersion: kitchen.rowVersion });
    return data;
  },
};
