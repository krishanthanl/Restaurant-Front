import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { BillingQueuePage } from './BillingQueuePage';
import { billingApi } from './billingApi';
vi.mock('./billingApi', () => ({ billingApi: { queue: vi.fn() } }));
vi.mock('../areas/api/areaApi', () => ({ areaApi: { getAreas: vi.fn().mockResolvedValue([]) } }));
afterEach(cleanup);
it('shows an earlier request and switches to the paid-bills server queue', async () => {
  vi.mocked(billingApi.queue).mockResolvedValue({ items: [{ orderId: 'o1', orderNumber: 42, areaId: null, waiterName: 'Waiter', requestedAtUtc: null, tables: [{ id: 't1', tableNumber: '1', capacity: 4 }], menuPreview: [], subtotal: 1000, billId: null, billingStatus: null, currency: null, grandTotal: null, balance: null, visitClosed: false }], page: 1, pageSize: 20, totalCount: 1 });
  render(<MemoryRouter><BillingQueuePage /></MemoryRouter>);
  expect(await screen.findByText('Earlier request')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open billing' })).toHaveAttribute('href', '/billing/orders/o1');
  fireEvent.click(screen.getByRole('tab', { name: 'Paid bills' }));
  await waitFor(() => expect(billingApi.queue).toHaveBeenLastCalledWith(expect.objectContaining({ paid: true, page: 1 }), expect.any(AbortSignal)));
});
