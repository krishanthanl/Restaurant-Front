import { apiClient } from '../../../services/apiClient';
export interface DiningSession {
  id: string; restaurantId: string; guestCount: number; openedBy: string;
  waiterId: string | null; waiterName: string | null; openedAt: string;
  status: number; closedAt: string | null; tableIds: string[];
}
export interface Waiter { id: string; fullName: string }
export const diningSessionApi = {
  async waiters(signal?: AbortSignal) { return (await apiClient.get<Waiter[]>('/dining-sessions/waiters', { signal })).data; },
  async active(tableId: string, signal?: AbortSignal) { return (await apiClient.get<DiningSession>(`/dining-sessions/active/${tableId}`, { signal })).data; },
  async open(tableId: string, guestCount: number, waiterId: string) {
    return (await apiClient.post<DiningSession>('/dining-sessions', { tableId, guestCount, waiterId: waiterId || null })).data;
  },
  async close(id: string) { return (await apiClient.post<DiningSession>(`/dining-sessions/${id}/close`)).data; },
};
