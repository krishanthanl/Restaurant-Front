import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';
import type { PagedResponse } from '../../menu/types/menuTypes';

export const orderStatusLabels = ['Open', 'Ready to bill', 'Closed', 'Cancelled'] as const;
export type OrderStatus = 0 | 1 | 2 | 3;
export interface OrderItem {
  id: string; menuItemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number;
  kitchenId: string; kitchenCode: string; kitchenName: string; notes: string | null;
}
export interface ActiveOrder {
  id: string; orderNumber: number; diningSessionId: string; status: OrderStatus;
  guestCount: number; waiterId: string | null; waiterName: string | null; areaId: string | null;
  tables: NonNullable<DiningSession['tables']>; subtotal: number; quantityTotal: number; openedAtUtc: string;
}
export interface Order extends ActiveOrder {
  notes: string | null; openedBy: string; updatedAtUtc: string | null;
  closedAtUtc: string | null; closedBy: string | null; cancelledAtUtc: string | null; cancelledBy: string | null;
  cancellationReason: string | null; items: OrderItem[]; rowVersion: string; sessionRowVersion: string;
}
export type OrderPage = PagedResponse<ActiveOrder>;
export interface ActiveOrderQuery { page: number; pageSize: number; areaId?: string; waiterId?: string; status?: number; }
export const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
