import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getApiErrorMessage } from '../../services/apiClient';
import { settingsApi } from './api/settingsApi';
import { RestaurantSettingsContext } from './restaurantSettingsContext';
import { defaultRestaurantSettings, type RestaurantSettings } from './types/settingsTypes';

// Loads the restaurant configuration once per signed-in layout; the Configurations page calls reload after saving.
export function RestaurantSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RestaurantSettings>(defaultRestaurantSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try { setSettings(await settingsApi.get()); setError(null); }
    catch (e) { setError(getApiErrorMessage(e)); throw e; }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    settingsApi.get(controller.signal).then(value => { if (!controller.signal.aborted) setSettings(value); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const value = useMemo(() => ({ settings, loading, error, reload }), [settings, loading, error, reload]);
  return <RestaurantSettingsContext.Provider value={value}>{children}</RestaurantSettingsContext.Provider>;
}
