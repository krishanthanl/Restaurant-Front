import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';
import type { PagedResponse } from '../../menu/types/menuTypes';
import type { KitchenTicketStatus } from '../../kitchen/types/kitchenTicketTypes';

export const orderStatusLabels = ['Open', 'Ready to bill', 'Closed', 'Cancelled'] as const;
export type OrderStatus = 0 | 1 | 2 | 3;
export interface OrderItem {
  id: string; menuItemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number;
  kitchenId: string; kitchenCode: string; kitchenName: string; notes: string | null;
  // Set once the line was sent; a sent line can only be voided, not edited.
  kitchenTicketId?: string | null; sentAtUtc?: string | null; voidedAtUtc?: string | null; voidReason?: string | null;
}
export interface OrderTicket {
  id: string; ticketNumber: number; kitchenId: string; kitchenCode: string; kitchenName: string;
  status: (typeof KitchenTicketStatus)[keyof typeof KitchenTicketStatus]; sentAtUtc: string; preparedAtUtc: string | null; servedAtUtc: string | null; rowVersion: string;
}
export interface ActiveOrder {
  id: string; orderNumber: number; diningSessionId: string; status: OrderStatus;
  guestCount: number; waiterId: string | null; waiterName: string | null; areaId: string | null;
  tables: NonNullable<DiningSession['tables']>; subtotal: number; quantityTotal: number; openedAtUtc: string;
  menuPreview?: Array<{ menuItemId: string; name: string; imagePath: string | null }>;
}
export interface Order extends ActiveOrder {
  notes: string | null; openedBy: string; updatedAtUtc: string | null;
  closedAtUtc: string | null; closedBy: string | null; cancelledAtUtc: string | null; cancelledBy: string | null;
  cancellationReason: string | null; items: OrderItem[]; rowVersion: string; sessionRowVersion: string; tickets?: OrderTicket[];
}
export type OrderPage = PagedResponse<ActiveOrder>;
export interface ActiveOrderQuery { page: number; pageSize: number; areaId?: string; waiterId?: string; status?: number; }
export const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
