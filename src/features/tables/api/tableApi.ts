import { apiClient } from '../../../services/apiClient';
import type { RestaurantTable, TableFilter, TableInput } from '../types/tableTypes';

export const tableApi = {
  async getTables(filter: TableFilter = 'active', areaId?: string, signal?: AbortSignal) {
    const { data } = await apiClient.get<RestaurantTable[]>('/tables', {
      params: { areaId, includeInactive: filter === 'all', isActive: filter === 'all' ? undefined : filter === 'active' }, signal,
    });
    return data;
  },
  async getTable(id: string) {
    const { data } = await apiClient.get<RestaurantTable>(`/tables/${id}`);
    return data;
  },
  async createTable(input: TableInput) {
    const { data } = await apiClient.post<RestaurantTable>('/tables', { ...input, name: input.name || null });
    return data;
  },
  async updateTable(table: RestaurantTable, input: TableInput) {
    const { data } = await apiClient.put<RestaurantTable>(`/tables/${table.id}`, {
      areaId: input.areaId, tableNumber: input.tableNumber, name: input.name || null, capacity: input.capacity, tableType: input.tableType, displayOrder: input.displayOrder, rowVersion: table.rowVersion,
    });
    return data;
  },
  async setTableCondition(table: RestaurantTable, condition: number) {
    const { data } = await apiClient.put<RestaurantTable>(`/tables/${table.id}/condition`, { condition, rowVersion: table.rowVersion });
    return data;
  },
  async setTableStatus(table: RestaurantTable, isActive: boolean) {
    const { data } = await apiClient.put<RestaurantTable>(`/tables/${table.id}/${isActive ? 'activate' : 'deactivate'}`, { rowVersion: table.rowVersion });
    return data;
  },
};
