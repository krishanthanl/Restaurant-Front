export const DiningSessionStatus = { Active: 0, Closed: 1, Cancelled: 2 } as const;
export interface DiningSession {
  id: string; restaurantId: string; guestCount: number; openedBy: string;
  waiterId: string | null; waiterName: string | null; openedAt: string;
  status: number; closedAt: string | null; tableIds: string[];
  notes: string | null; createdAtUtc: string; updatedAtUtc: string | null;
  cancelledAt: string | null; closedBy: string | null; cancelledBy: string | null;
  cancellationReason: string | null; rowVersion: string;
}
export interface Waiter { id: string; fullName: string }
export interface SessionInput { guestCount: number; waiterId: string | null; notes: string | null }
