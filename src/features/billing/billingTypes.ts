import type { PagedResponse } from '../menu/types/menuTypes';
export const billStatusLabels = ['Unpaid', 'Partially paid', 'Paid', 'Voided'] as const;
export const paymentMethods = ['Cash', 'Card', 'QR'] as const;
export interface BillingSettings { currency: string; taxRate: number; serviceChargeRate: number; rowVersion: string; }
export interface BillItem { id: string; menuItemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number; }
export interface Payment { id: string; method: number; amount: number; tenderedAmount: number | null; change: number; recordedBy: string; cashierName: string; recordedAtUtc: string; voidedAtUtc: string | null; voidReason: string | null; voidedByName: string | null; }
export interface Bill {
  id: string; billNumber: number; orderId: string; orderNumber: number; restaurantName: string; currency: string;
  subtotal: number; serviceChargeRate: number; serviceCharge: number; taxRate: number; tax: number; grandTotal: number; paidAmount: number; balance: number;
  status: number; generatedAtUtc: string; cashierName: string; billRequestedAtUtc: string | null;
  tables: Array<{ id: string; tableNumber: string; capacity: number }>; items: BillItem[]; payments: Payment[]; rowVersion: string; visitClosed: boolean;
}
export interface BillingQueueItem {
  orderId: string; orderNumber: number; areaId: string | null; waiterName: string | null; requestedAtUtc: string | null;
  tables: Bill['tables']; menuPreview: Array<{ menuItemId: string; name: string; imagePath: string | null }>;
  subtotal: number; billId: string | null; billingStatus: number | null; currency: string | null; grandTotal: number | null; balance: number | null; visitClosed: boolean;
}
export type BillingQueuePage = PagedResponse<BillingQueueItem>;
export interface BillingWrite { rowVersion: string; operationId: string; }
export interface PaymentInput extends BillingWrite { method: number; amount: number; tenderedAmount: number | null; }
