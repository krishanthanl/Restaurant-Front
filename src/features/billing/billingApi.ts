import { apiClient } from '../../services/apiClient';
import type { Bill, BillingQueuePage, BillingSettings, BillingWrite, PaymentInput } from './billingTypes';

export const billingApi = {
  async queue(query: { paid: boolean; page: number; pageSize: number; areaId?: string }, signal?: AbortSignal) { return (await apiClient.get<BillingQueuePage>('/billing/queue', { params: query, signal })).data; },
  async forOrder(id: string, signal?: AbortSignal) { return (await apiClient.get<Bill>(`/orders/${id}/bill`, { signal })).data; },
  async generate(id: string, request: BillingWrite) { return (await apiClient.post<Bill>(`/orders/${id}/bill`, request)).data; },
  async pay(id: string, request: PaymentInput) { return (await apiClient.post<Bill>(`/bills/${id}/payments`, request)).data; },
  async voidPayment(id: string, paymentId: string, request: BillingWrite & { reason: string }) { return (await apiClient.post<Bill>(`/bills/${id}/payments/${paymentId}/void`, request)).data; },
  async settings(signal?: AbortSignal) { return (await apiClient.get<BillingSettings>('/billing/settings', { signal })).data; },
  async updateSettings(request: BillingSettings & { operationId: string }) { return (await apiClient.put<BillingSettings>('/billing/settings', request)).data; },
};
