import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ActiveOrdersPage } from './ActiveOrdersPage';
import { orderApi } from '../api/orderApi';
vi.mock('../api/orderApi', () => ({ orderApi: { active: vi.fn() } }));
vi.mock('../../areas/api/areaApi', () => ({ areaApi: { getAreas: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../authentication/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
afterEach(cleanup);
it('shows an empty state', async () => {
  vi.mocked(orderApi.active).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
  render(<MemoryRouter><ActiveOrdersPage /></MemoryRouter>);
  expect(await screen.findByText('No active orders')).toBeInTheDocument();
});
it('shows backend failures and offers refresh', async () => {
  vi.mocked(orderApi.active).mockRejectedValue(new Error('Could not load orders'));
  render(<MemoryRouter><ActiveOrdersPage /></MemoryRouter>);
  expect(await screen.findByText('Could not load orders')).toBeInTheDocument();
});
