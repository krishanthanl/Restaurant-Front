import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BillingDetailPage } from './BillingDetailPage';
import { billingApi } from './billingApi';
import { orderApi } from '../orders/api/orderApi';
import type { Bill } from './billingTypes';

vi.mock('./billingApi', () => ({ billingApi: { forOrder: vi.fn(), generate: vi.fn(), pay: vi.fn(), voidPayment: vi.fn() } }));
vi.mock('../orders/api/orderApi', () => ({ orderApi: { get: vi.fn() } }));
vi.mock('../authentication/useAuth', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
const bill: Bill = {
  id: 'b1', orderId: 'o1', billNumber: 5, orderNumber: 42, restaurantName: 'Tasty', currency: 'LKR', subtotal: 1000,
  serviceChargeRate: 10, serviceCharge: 100, taxRate: 5, tax: 50, grandTotal: 1150, paidAmount: 400, balance: 750,
  status: 1, generatedAtUtc: '2026-10-25T10:00:00Z', cashierName: 'Cashier', billRequestedAtUtc: null,
  tables: [{ id: 't1', tableNumber: '1', capacity: 4 }], items: [{ id: 'i1', menuItemId: 'm1', name: 'Meal', quantity: 1, unitPrice: 1000, lineTotal: 1000 }],
  payments: [], rowVersion: 'v1', visitClosed: false,
};
const show = () => render(<MemoryRouter initialEntries={['/billing/orders/o1']}><Routes><Route path="/billing/orders/:id" element={<BillingDetailPage />} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(billingApi.forOrder).mockResolvedValue(bill);
  vi.mocked(orderApi.get).mockResolvedValue({ id: 'o1', orderNumber: 42, status: 1, rowVersion: 'ov1', items: [], tables: [], billingStatus: 1 } as never);
});
afterEach(cleanup);

it('prints the server bill with its charge breakdown', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Print bill' }));
  expect(print).toHaveBeenCalledOnce();
  expect(screen.getByText('Service charge (10%)')).toBeInTheDocument();
  expect(screen.getByText('Tax (5%)')).toBeInTheDocument();
  print.mockRestore();
});

it('sends one payment while busy and refreshes after a conflict while retaining the input', async () => {
  let reject!: (reason: unknown) => void;
  vi.mocked(billingApi.pay).mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  show();
  const amount = await screen.findByLabelText('Payment amount');
  fireEvent.change(amount, { target: { value: '400' } });
  fireEvent.change(screen.getByLabelText('Cash tendered'), { target: { value: '500' } });
  const submit = screen.getByRole('button', { name: 'Record payment' });
  act(() => { submit.click(); submit.click(); });
  expect(billingApi.pay).toHaveBeenCalledOnce();
  expect(submit).toBeDisabled();
  reject({ isAxiosError: true, response: { status: 409, data: { detail: 'Bill changed. Refresh.' } } });
  expect(await screen.findByText('Bill changed. Refresh.')).toBeInTheDocument();
  await waitFor(() => expect(billingApi.forOrder).toHaveBeenCalledTimes(2));
  expect(amount).toHaveValue('400');
});
