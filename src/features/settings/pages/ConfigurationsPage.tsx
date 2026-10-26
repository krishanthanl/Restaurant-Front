import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardContent, FormControlLabel, FormHelperText, Stack, Switch, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { ErrorState, LoadingState } from '../../../components/ContentState';
import { getApiErrorMessage } from '../../../services/apiClient';
import { settingsApi } from '../api/settingsApi';
import { useRestaurantSettings } from '../restaurantSettingsContext';
import type { RestaurantSettings } from '../types/settingsTypes';

export function ConfigurationsPage() {
  const { reload: reloadShared } = useRestaurantSettings();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);
  const apply = useCallback((value: RestaurantSettings) => { setSettings(value); setAllowMultiple(value.allowMultipleOrdersPerDiningSession); }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError(null);
    settingsApi.get(controller.signal).then(value => { if (!controller.signal.aborted) apply(value); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setLoadError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apply, revision]);
  const save = async () => {
    if (inFlight.current || !settings) return;
    inFlight.current = true; setSaving(true); setSaveError(null); setSaved(false);
    try {
      apply(await settingsApi.update({ allowMultipleOrdersPerDiningSession: allowMultiple, rowVersion: settings.rowVersion }));
      setSaved(true);
      // Other screens read the shared copy; refresh it so they switch workflow straight away.
      await reloadShared().catch(() => { /* the provider keeps its own error */ });
    } catch (e) {
      setSaveError(getApiErrorMessage(e));
      // Keep the user's choice but pick up the current version so a retry is not stale.
      try { setSettings(await settingsApi.get()); } catch { /* the error above is already shown */ }
    } finally { inFlight.current = false; setSaving(false); }
  };
  if (loading) return <LoadingState label="Loading configurations…" />;
  if (loadError || !settings) return <ErrorState message={loadError ?? 'Configurations were not found.'} onRetry={() => setRevision(x => x + 1)} />;
  const dirty = allowMultiple !== settings.allowMultipleOrdersPerDiningSession;
  return <>
    <PageHeader eyebrow="Administration" title="Configurations" description="Restaurant-wide settings that change how the app works for every staff member." />
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      {saveError && <Alert severity="error">{saveError}</Alert>}
      {saved && <Alert severity="success">Configurations saved.</Alert>}
      <Card component="section" aria-label="Dining and ordering"><CardContent><Stack spacing={1}>
        <Typography variant="h6">Dining and ordering</Typography>
        <FormControlLabel label="Multiple orders per dining session (separate checks)"
          control={<Switch checked={allowMultiple} disabled={saving} onChange={e => { setAllowMultiple(e.target.checked); setSaved(false); }} />} />
        <FormHelperText>
          On: guests at one table can each have their own order and bill; the visit ends when its last check is closed.
          Off: one dining session has one order and one bill. Turning this off does not split or merge visits that already
          have several checks; they are finished check by check.
        </FormHelperText>
      </Stack></CardContent></Card>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" disabled={saving || !dirty} onClick={() => void save()}>{saving ? 'Saving…' : 'Save configurations'}</Button>
        <Button disabled={saving || !dirty} onClick={() => apply(settings)}>Discard changes</Button>
      </Stack>
      {settings.updatedAtUtc && <Typography variant="body2" color="text.secondary">Last changed {new Date(settings.updatedAtUtc).toLocaleString()}.</Typography>}
    </Stack>
  </>;
}
