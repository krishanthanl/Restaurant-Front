import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';

// Values match the backend KitchenTicketStatus enum.
export const KitchenTicketStatus = { New: 0, Acknowledged: 1, Preparing: 2, Prepared: 3, Served: 4, Cancelled: 5 } as const;
export const kitchenTicketStatusLabels = ['New', 'Acknowledged', 'Preparing', 'Prepared', 'Served', 'Cancelled'] as const;
export type KitchenTicketAction = 'acknowledge' | 'start' | 'prepared' | 'served';

export interface KitchenTicketLine { id: string; name: string; quantity: number; notes: string | null; isVoided: boolean; voidReason: string | null }
export interface KitchenTicket {
  id: string; orderId: string; orderNumber: number; ticketNumber: number;
  kitchenId: string; kitchenCode: string; kitchenName: string; status: number;
  sentAtUtc: string; acknowledgedAtUtc: string | null; preparingAtUtc: string | null; preparedAtUtc: string | null; servedAtUtc: string | null;
  tables: NonNullable<DiningSession['tables']>; orderNotes: string | null; lines: KitchenTicketLine[]; rowVersion: string;
  // Separate checks on one table look alike without it.
  checkLabel?: string | null;
}
