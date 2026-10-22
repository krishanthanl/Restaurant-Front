import { apiClient } from '../../../services/apiClient';
import type { ActiveOrderQuery, Order, OrderPage } from '../types/orderTypes';

export const orderApi = {
  async get(id: string, signal?: AbortSignal) { return (await apiClient.get<Order>(`/orders/${id}`, { signal })).data; },
  async forSession(id: string, signal?: AbortSignal) { return (await apiClient.get<Order>(`/dining-sessions/${id}/order`, { signal })).data; },
  async active(query: ActiveOrderQuery, signal?: AbortSignal) { return (await apiClient.get<OrderPage>('/orders/active', { params: query, signal })).data; },
  async create(diningSessionId: string, sessionRowVersion: string, operationId: string) {
    return (await apiClient.post<Order>('/orders', { diningSessionId, sessionRowVersion, operationId })).data;
  },
  async add(id: string, menuItemId: string, quantity: number, notes: string | null, rowVersion: string, operationId: string) {
    return (await apiClient.post<Order>(`/orders/${id}/items`, { menuItemId, quantity, notes, rowVersion, operationId })).data;
  },
  async updateItem(id: string, itemId: string, quantity: number, notes: string | null, rowVersion: string, operationId: string) {
    return (await apiClient.put<Order>(`/orders/${id}/items/${itemId}`, { quantity, notes, rowVersion, operationId })).data;
  },
  async remove(id: string, itemId: string, rowVersion: string, operationId: string) {
    return (await apiClient.delete<Order>(`/orders/${id}/items/${itemId}`, { data: { rowVersion, operationId } })).data;
  },
  async notes(id: string, notes: string | null, rowVersion: string, operationId: string) {
    return (await apiClient.put<Order>(`/orders/${id}/notes`, { notes, rowVersion, operationId })).data;
  },
  async ready(id: string, rowVersion: string, operationId: string) {
    return (await apiClient.post<Order>(`/orders/${id}/ready-to-bill`, { rowVersion, operationId })).data;
  },
  async reopen(id: string, rowVersion: string, operationId: string) {
    return (await apiClient.post<Order>(`/orders/${id}/reopen`, { rowVersion, operationId })).data;
  },
  async end(id: string, action: 'close' | 'cancel', rowVersion: string, sessionRowVersion: string, operationId: string, reason?: string) {
    return (await apiClient.post<Order>(`/orders/${id}/${action}`, { rowVersion, sessionRowVersion, operationId, reason })).data;
  },
};
