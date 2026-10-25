import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BillingSettingsPage } from './BillingSettingsPage';
import { billingApi } from './billingApi';
vi.mock('./billingApi', () => ({ billingApi: { settings: vi.fn(), updateSettings: vi.fn() } }));
afterEach(cleanup);
it('refreshes displayed settings after a conflict instead of overwriting a concurrent manager change', async () => {
  vi.mocked(billingApi.settings).mockResolvedValueOnce({ currency: 'LKR', taxRate: 5, serviceChargeRate: 10, rowVersion: 'v1' })
    .mockResolvedValue({ currency: 'USD', taxRate: 8, serviceChargeRate: 12, rowVersion: 'v2' });
  vi.mocked(billingApi.updateSettings).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Settings changed.' } } });
  render(<BillingSettingsPage />);
  const tax = await screen.findByLabelText('Tax percentage');
  fireEvent.change(tax, { target: { value: '6' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save billing settings' }));
  expect(await screen.findByText('Settings changed.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('Currency code')).toHaveValue('USD'));
  expect(tax).toHaveValue('8');
  expect(screen.getByLabelText('Service charge percentage')).toHaveValue('12');
});
