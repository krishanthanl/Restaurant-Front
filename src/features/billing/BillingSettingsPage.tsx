import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState, LoadingState } from '../../components/ContentState';
import { getApiErrorMessage } from '../../services/apiClient';
import { billingApi } from './billingApi';
import { useBillingMutation } from './useBillingMutation';
import type { BillingSettings } from './billingTypes';

export function BillingSettingsPage() {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [currency, setCurrency] = useState('LKR'); const [tax, setTax] = useState('0'); const [service, setService] = useState('0');
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  const applySettings = useCallback((value: BillingSettings) => {
    setSettings(value);
    setCurrency(value.currency); setTax(String(value.taxRate)); setService(String(value.serviceChargeRate));
  }, []);
  const reload = useCallback(async () => { applySettings(await billingApi.settings()); setError(null); }, [applySettings]);
  useEffect(() => {
    const controller = new AbortController();
    billingApi.settings(controller.signal).then(value => { if (!controller.signal.aborted) applySettings(value); })
      .catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [applySettings]);
  const mutation = useBillingMutation<BillingSettings>(reload, setSettings);
  const rateValid = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0 && Number(value) <= 100;
  if (loading) return <LoadingState label="Loading billing settings…" />;
  if (error || !settings) return <ErrorState message={error ?? 'Billing settings were not found.'} onRetry={() => void mutation.refresh()} />;
  return <>
    <PageHeader eyebrow="Master data" title="Billing settings" description="These settings apply to newly generated bills. Existing bills retain their original charges." />
    <Stack component="form" spacing={2} sx={{ maxWidth: 500 }} onSubmit={e => {
      e.preventDefault(); setSaved(false);
      const request = { currency, taxRate: Number(tax), serviceChargeRate: Number(service), rowVersion: settings.rowVersion, operationId: crypto.randomUUID() };
      void mutation.run(() => billingApi.updateSettings(request), () => setSaved(true));
    }}>
      {mutation.error && <Alert severity="error">{mutation.error}</Alert>}
      {saved && <Alert severity="success">Billing settings saved.</Alert>}
      <TextField label="Currency code" value={currency} disabled={mutation.blocked} onChange={e => setCurrency(e.target.value.toUpperCase())} helperText="Three-letter currency code, for example LKR." slotProps={{ htmlInput: { maxLength: 3 } }} />
      <TextField label="Tax percentage" value={tax} disabled={mutation.blocked} onChange={e => setTax(e.target.value)} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
      <TextField label="Service charge percentage" value={service} disabled={mutation.blocked} onChange={e => setService(e.target.value)} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
      <Typography variant="body2">Both percentages apply independently to the item subtotal. Menu prices exclude these charges.</Typography>
      <Button type="submit" variant="contained" disabled={mutation.blocked || !/^[A-Z]{3}$/.test(currency) || !rateValid(tax) || !rateValid(service)}>Save billing settings</Button>
      {mutation.retryPending && <Button disabled={mutation.saving} onClick={() => void mutation.retry()}>Retry pending action</Button>}
      {mutation.refreshRequired && <Button disabled={mutation.saving} onClick={() => void mutation.refresh()}>Refresh billing settings</Button>}
    </Stack>
  </>;
}
