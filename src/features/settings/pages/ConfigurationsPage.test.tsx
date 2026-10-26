import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConfigurationsPage } from './ConfigurationsPage';
import { settingsApi } from '../api/settingsApi';
import { RestaurantSettingsContext } from '../restaurantSettingsContext';
import { defaultRestaurantSettings, type RestaurantSettings } from '../types/settingsTypes';

vi.mock('../api/settingsApi', () => ({ settingsApi: { get: vi.fn(), update: vi.fn() } }));
const reloadShared = vi.fn();
const show = () => render(<RestaurantSettingsContext.Provider value={{ settings: defaultRestaurantSettings, loading: false, error: null, reload: reloadShared }}>
  <ConfigurationsPage /></RestaurantSettingsContext.Provider>);
const toggle = () => screen.getByRole('switch', { name: 'Multiple orders per dining session (separate checks)' });
beforeEach(() => {
  vi.resetAllMocks();
  reloadShared.mockResolvedValue(undefined);
  vi.mocked(settingsApi.get).mockResolvedValue(defaultRestaurantSettings);
});
afterEach(cleanup);

it('starts off and saves the switch with the current row version, then refreshes the shared settings', async () => {
  const saved: RestaurantSettings = { allowMultipleOrdersPerDiningSession: true, updatedAtUtc: '2026-10-26T08:00:00Z', rowVersion: 'v1' };
  vi.mocked(settingsApi.update).mockResolvedValue(saved);
  show();
  await waitFor(() => expect(toggle()).not.toBeChecked());
  expect(screen.getByRole('button', { name: 'Save configurations' })).toBeDisabled();
  fireEvent.click(toggle());
  fireEvent.click(screen.getByRole('button', { name: 'Save configurations' }));
  await waitFor(() => expect(settingsApi.update).toHaveBeenCalledWith({ allowMultipleOrdersPerDiningSession: true, rowVersion: '' }));
  expect(await screen.findByText('Configurations saved.')).toBeInTheDocument();
  expect(toggle()).toBeChecked();
  expect(reloadShared).toHaveBeenCalled();
});

it('submits once on a double click', async () => {
  let finish!: (value: RestaurantSettings) => void;
  vi.mocked(settingsApi.update).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show();
  await waitFor(() => expect(toggle()).toBeInTheDocument());
  fireEvent.click(toggle());
  const save = screen.getByRole('button', { name: 'Save configurations' });
  act(() => { save.click(); save.click(); });
  expect(settingsApi.update).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ allowMultipleOrdersPerDiningSession: true, updatedAtUtc: null, rowVersion: 'v1' }); });
});

it('shows a conflict, keeps the choice and retries with the refreshed version', async () => {
  vi.mocked(settingsApi.get).mockResolvedValueOnce(defaultRestaurantSettings)
    .mockResolvedValue({ allowMultipleOrdersPerDiningSession: false, updatedAtUtc: null, rowVersion: 'v2' });
  vi.mocked(settingsApi.update).mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { detail: 'Configurations changed. Refresh and try again.' } } })
    .mockResolvedValue({ allowMultipleOrdersPerDiningSession: true, updatedAtUtc: null, rowVersion: 'v3' });
  show();
  await waitFor(() => expect(toggle()).toBeInTheDocument());
  fireEvent.click(toggle());
  fireEvent.click(screen.getByRole('button', { name: 'Save configurations' }));
  expect(await screen.findByText('Configurations changed. Refresh and try again.')).toBeInTheDocument();
  expect(toggle()).toBeChecked();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save configurations' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Save configurations' }));
  await waitFor(() => expect(settingsApi.update).toHaveBeenLastCalledWith({ allowMultipleOrdersPerDiningSession: true, rowVersion: 'v2' }));
});

it('shows a load failure with retry', async () => {
  vi.mocked(settingsApi.get).mockRejectedValueOnce(new Error('Network down')).mockResolvedValue(defaultRestaurantSettings);
  show();
  fireEvent.click(await screen.findByRole('button', { name: /retry/i }));
  await waitFor(() => expect(toggle()).toBeInTheDocument());
});
