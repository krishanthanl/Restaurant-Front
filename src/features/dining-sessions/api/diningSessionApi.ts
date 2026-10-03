import { apiClient } from '../../../services/apiClient';
import type { DiningSession, SessionInput, Waiter } from '../types/diningSessionTypes';
export type { DiningSession, Waiter } from '../types/diningSessionTypes';
export const diningSessionApi = {
  async waiters(signal?: AbortSignal) { return (await apiClient.get<Waiter[]>('/dining-sessions/waiters', { signal })).data; },
  async active(tableId: string, signal?: AbortSignal) { return (await apiClient.get<DiningSession>(`/dining-sessions/active/${tableId}`, { signal })).data; },
  async get(id: string, signal?: AbortSignal) { return (await apiClient.get<DiningSession>(`/dining-sessions/${id}`, { signal })).data; },
  async list(areaId?: string, waiterId?: string, signal?: AbortSignal) {
    return (await apiClient.get<DiningSession[]>('/dining-sessions', { params: { status: 0, areaId, waiterId }, signal })).data;
  },
  async open(tableId: string, guestCount: number, waiterId: string, notes: string, tableRowVersion: string) {
    return (await apiClient.post<DiningSession>('/dining-sessions', { tableId, guestCount, waiterId: waiterId || null, notes: notes || null, tableRowVersion })).data;
  },
  async update(session: DiningSession, input: SessionInput) {
    return (await apiClient.put<DiningSession>(`/dining-sessions/${session.id}`, { ...input, rowVersion: session.rowVersion })).data;
  },
  async assignWaiter(session: DiningSession, waiterId: string | null) {
    return (await apiClient.put<DiningSession>(`/dining-sessions/${session.id}/waiter`, { waiterId, rowVersion: session.rowVersion })).data;
  },
  async changeGuests(session: DiningSession, guestCount: number) {
    return (await apiClient.put<DiningSession>(`/dining-sessions/${session.id}/guest-count`, { guestCount, rowVersion: session.rowVersion })).data;
  },
  async updateNotes(session: DiningSession, notes: string | null) {
    return (await apiClient.put<DiningSession>(`/dining-sessions/${session.id}/notes`, { notes, rowVersion: session.rowVersion })).data;
  },
  async close(id: string, rowVersion: string) { return (await apiClient.post<DiningSession>(`/dining-sessions/${id}/close`, { rowVersion })).data; },
  async cancel(id: string, rowVersion: string, reason: string) { return (await apiClient.post<DiningSession>(`/dining-sessions/${id}/cancel`, { rowVersion, reason })).data; },
};
