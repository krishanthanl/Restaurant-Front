import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionChecksPanel } from './SessionChecksPanel';
import { orderApi } from '../api/orderApi';
import { diningSessionApi } from '../../dining-sessions/api/diningSessionApi';
import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';
import type { Order, SessionCheck } from '../types/orderTypes';
import { RestaurantSettingsContext } from '../../settings/restaurantSettingsContext';
import { defaultRestaurantSettings } from '../../settings/types/settingsTypes';
import type { ReactNode } from 'react';

vi.mock('../api/orderApi', () => ({ orderApi: { listForSession: vi.fn(), create: vi.fn() } }));
vi.mock('../../dining-sessions/api/diningSessionApi', () => ({ diningSessionApi: { get: vi.fn() } }));
const session = { id: 's1', rowVersion: 'version1', status: 0 } as DiningSession;
const check = (over: Partial<SessionCheck>): SessionCheck =>
  ({ id: 'o1', orderNumber: 1, checkLabel: null, status: 0, subtotal: 0, billingStatus: null, openedAtUtc: '', rowVersion: 'v', ...over });
// Separate checks are on unless a test says otherwise.
let separateChecks = true;
const Settings = ({ children }: { children: ReactNode }) => <RestaurantSettingsContext.Provider value={{
  settings: { ...defaultRestaurantSettings, allowMultipleOrdersPerDiningSession: separateChecks }, loading: false, error: null, reload: async () => {} }}>
  {children}</RestaurantSettingsContext.Provider>;
const show = (props: Partial<Parameters<typeof SessionChecksPanel>[0]> = {}) => render(<Settings><MemoryRouter initialEntries={['/']}><Routes>
  <Route path="/" element={<SessionChecksPanel session={session} disabled={false} {...props} />} />
  <Route path="/orders/:id" element={<p>Order screen</p>} />
</Routes></MemoryRouter></Settings>);
beforeEach(() => {
  vi.resetAllMocks();
  separateChecks = true;
  vi.mocked(orderApi.listForSession).mockResolvedValue([]);
  vi.mocked(diningSessionApi.get).mockResolvedValue(session);
});
afterEach(cleanup);

it('starts the first check with the latest session version and opens it', async () => {
  vi.mocked(orderApi.create).mockResolvedValue({ id: 'o9', orderNumber: 9 } as Order);
  const onHasActiveChecks = vi.fn();
  const view = show({ onHasActiveChecks });
  await waitFor(() => expect(onHasActiveChecks).toHaveBeenLastCalledWith(false));
  view.rerender(<Settings><MemoryRouter><Routes>
    <Route path="/" element={<SessionChecksPanel session={{ ...session, rowVersion: 'version2' }} disabled={false} />} />
    <Route path="/orders/:id" element={<p>Order screen</p>} />
  </Routes></MemoryRouter></Settings>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start order' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Start order' }));
  await waitFor(() => expect(orderApi.create).toHaveBeenCalledWith('s1', 'version2', expect.any(String), null));
  expect(await screen.findByText('Order screen')).toBeInTheDocument();
});

it('lists separate checks and adds another with a trimmed label, once', async () => {
  vi.mocked(orderApi.listForSession).mockResolvedValue([
    check({ id: 'o1', orderNumber: 17, checkLabel: 'Seat 1', subtotal: 12.5, status: 1, billingStatus: 2 }),
    check({ id: 'o2', orderNumber: 18, status: 2 }),
  ]);
  let finish!: (order: Order) => void;
  vi.mocked(orderApi.create).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const onHasActiveChecks = vi.fn();
  show({ onHasActiveChecks });
  expect(await screen.findByRole('link', { name: /Seat 1 · #17/ })).toHaveAttribute('href', '/orders/o1');
  expect(screen.getByRole('link', { name: /Order #18/ })).toHaveAttribute('href', '/orders/o2');
  expect(screen.getByText(/Paid/)).toBeInTheDocument();
  await waitFor(() => expect(onHasActiveChecks).toHaveBeenLastCalledWith(true));
  fireEvent.change(screen.getByLabelText('Check label (optional)'), { target: { value: '  Seat 3 ' } });
  const add = screen.getByRole('button', { name: 'Add check' });
  act(() => { add.click(); add.click(); });
  expect(orderApi.create).toHaveBeenCalledTimes(1);
  expect(orderApi.create).toHaveBeenCalledWith('s1', 'version1', expect.any(String), 'Seat 3');
  finish({ id: 'o3', orderNumber: 19 } as Order);
  expect(await screen.findByText('Order screen')).toBeInTheDocument();
});

it('rejects an overlong label and reports only closed checks as inactive', async () => {
  vi.mocked(orderApi.listForSession).mockResolvedValue([check({ status: 2 }), check({ id: 'o2', status: 3 })]);
  const onHasActiveChecks = vi.fn();
  show({ onHasActiveChecks });
  await waitFor(() => expect(onHasActiveChecks).toHaveBeenLastCalledWith(false));
  fireEvent.change(screen.getByLabelText('Check label (optional)'), { target: { value: 'x'.repeat(51) } });
  expect(screen.getByText('Up to 50 characters')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add check' })).toBeDisabled();
});

it('shows a failed creation and reloads the checks', async () => {
  vi.mocked(orderApi.create).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Dining session must be active.' } } });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Start order' }));
  expect(await screen.findByText('Dining session must be active.')).toBeInTheDocument();
  await waitFor(() => expect(orderApi.listForSession).toHaveBeenCalledTimes(2));
  expect(diningSessionApi.get).toHaveBeenCalledWith('s1');
});

it('keeps the original one-order flow when separate checks are turned off', async () => {
  separateChecks = false;
  vi.mocked(orderApi.create).mockResolvedValue({ id: 'o9', orderNumber: 9 } as Order);
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Start order' }));
  expect(screen.queryByLabelText('Check label (optional)')).not.toBeInTheDocument();
  await waitFor(() => expect(orderApi.create).toHaveBeenCalledWith('s1', 'version1', expect.any(String), null));
  expect(await screen.findByText('Order screen')).toBeInTheDocument();
});

it('opens the single existing order and offers no extra check when turned off', async () => {
  separateChecks = false;
  vi.mocked(orderApi.listForSession).mockResolvedValue([check({ id: 'o1', orderNumber: 17 })]);
  const onHasActiveChecks = vi.fn();
  show({ onHasActiveChecks });
  expect(await screen.findByRole('link', { name: 'Open order #17' })).toHaveAttribute('href', '/orders/o1');
  expect(screen.queryByRole('button', { name: 'Add check' })).not.toBeInTheDocument();
  await waitFor(() => expect(onHasActiveChecks).toHaveBeenLastCalledWith(true));
});

it('still lists checks of a visit that had several before the switch was turned off', async () => {
  separateChecks = false;
  vi.mocked(orderApi.listForSession).mockResolvedValue([check({ id: 'o1', orderNumber: 17, checkLabel: 'Seat 1' }), check({ id: 'o2', orderNumber: 18 })]);
  show();
  expect(await screen.findByRole('link', { name: /Seat 1 · #17/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Order #18/ })).toBeInTheDocument();
  expect(screen.getByText(/Separate checks are turned off/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add check' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Check label (optional)')).not.toBeInTheDocument();
});
