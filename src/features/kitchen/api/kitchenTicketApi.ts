import { apiClient } from '../../../services/apiClient';
import type { KitchenTicket, KitchenTicketAction } from '../types/kitchenTicketTypes';

export const kitchenTicketApi = {
  async active(kitchenId?: string, signal?: AbortSignal) {
    return (await apiClient.get<KitchenTicket[]>('/kitchen-tickets/active', { params: { kitchenId }, signal })).data;
  },
  async advance(ticket: { id: string; rowVersion: string }, action: KitchenTicketAction) {
    return (await apiClient.post<KitchenTicket>(`/kitchen-tickets/${ticket.id}/${action}`, { rowVersion: ticket.rowVersion })).data;
  },
};
