import { apiClient } from '../../../services/apiClient';
import type { RestaurantSettings, RestaurantSettingsInput } from '../types/settingsTypes';

export const settingsApi = {
  async get(signal?: AbortSignal) { return (await apiClient.get<RestaurantSettings>('/settings', { signal })).data; },
  async update(input: RestaurantSettingsInput) { return (await apiClient.put<RestaurantSettings>('/settings', input)).data; },
};
