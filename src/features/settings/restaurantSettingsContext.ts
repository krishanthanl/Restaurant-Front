import { createContext, useContext } from 'react';
import { defaultRestaurantSettings, type RestaurantSettings } from './types/settingsTypes';

export interface RestaurantSettingsState { settings: RestaurantSettings; loading: boolean; error: string | null; reload: () => Promise<void>; }

// Outside the provider, or while loading/after a failed load, screens fall back to the defaults (separate checks off);
// the backend enforces the real setting either way.
export const RestaurantSettingsContext = createContext<RestaurantSettingsState>({
  settings: defaultRestaurantSettings, loading: false, error: null, reload: async () => {},
});

export const useRestaurantSettings = () => useContext(RestaurantSettingsContext);
