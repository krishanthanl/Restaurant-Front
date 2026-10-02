import { apiClient } from '../../../services/apiClient';
import type { Area, AreaFilter, AreaInput } from '../types/areaTypes';

export const areaApi = {
  async getAreas(filter: AreaFilter = 'active', signal?: AbortSignal) {
    const { data } = await apiClient.get<Area[]>('/areas', {
      params: { includeInactive: filter === 'all', isActive: filter === 'all' ? undefined : filter === 'active' }, signal,
    });
    return data;
  },
  async getArea(id: string) {
    const { data } = await apiClient.get<Area>(`/areas/${id}`);
    return data;
  },
  async createArea(input: AreaInput) {
    const { data } = await apiClient.post<Area>('/areas', { ...input, description: input.description || null });
    return data;
  },
  async updateArea(area: Area, input: AreaInput) {
    const { data } = await apiClient.put<Area>(`/areas/${area.id}`, {
      name: input.name, description: input.description || null, displayOrder: input.displayOrder, rowVersion: area.rowVersion,
    });
    return data;
  },
  async setAreaStatus(area: Area, isActive: boolean) {
    const { data } = await apiClient.put<Area>(`/areas/${area.id}/${isActive ? 'activate' : 'deactivate'}`, { rowVersion: area.rowVersion });
    return data;
  },
};
