import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Chip, CircularProgress, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';
import { checkLabelMaxLength, checkName, formatAmount, isActiveOrderStatus, orderStatusLabels } from '../types/orderTypes';
import type { SessionCheck } from '../types/orderTypes';
import { billStatusLabels } from '../../billing/billingTypes';
import { orderApi } from '../api/orderApi';
import { useOrderMutation } from '../hooks/useOrderMutation';
import { getApiErrorMessage } from '../../../services/apiClient';
import { diningSessionApi } from '../../dining-sessions/api/diningSessionApi';
import { DiningSessionStatus } from '../../dining-sessions/types/diningSessionTypes';
import { useRestaurantSettings } from '../../settings/restaurantSettingsContext';

// Lists the visit's separate checks and adds new ones. onHasActiveChecks reports, once known, whether any check is
// still Open or ReadyToBill (the session itself can then only end through its checks).
export function SessionChecksPanel({ session, disabled, onHasActiveChecks }:
  { session: DiningSession; disabled: boolean; onHasActiveChecks?: (hasActiveChecks: boolean) => void }) {
  const navigate = useNavigate();
  const separateChecks = useRestaurantSettings().settings.allowMultipleOrdersPerDiningSession;
  const [checks, setChecks] = useState<SessionCheck[]>([]);
  const [currentSession, setCurrentSession] = useState(session);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const reload = useCallback(async () => {
    const [current, list] = await Promise.all([diningSessionApi.get(session.id), orderApi.listForSession(session.id)]);
    setCurrentSession(current); setChecks(list);
  }, [session.id]);
  useEffect(() => {
    const controller = new AbortController();
    setCurrentSession(session); setChecks([]);
    setLoading(true); setError(null);
    orderApi.listForSession(session.id, controller.signal).then(value => { if (!controller.signal.aborted) setChecks(value); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session]);
  const hasActiveChecks = checks.some(x => isActiveOrderStatus(x.status));
  useEffect(() => { if (!loading && !error) onHasActiveChecks?.(hasActiveChecks); }, [loading, error, hasActiveChecks, onHasActiveChecks]);
  const mutation = useOrderMutation(reload);
  const trimmed = label.trim();
  const tooLong = trimmed.length > checkLabelMaxLength;
  const canAdd = !disabled && !loading && !error && !mutation.blocked && !tooLong && currentSession.status === DiningSessionStatus.Active;
  const add = () => {
    const operation = crypto.randomUUID();
    let createdId = '';
    // Opening the new check straight away keeps the waiter flow to one tap.
    void mutation.run(async () => {
      const created = await orderApi.create(session.id, currentSession.rowVersion, operation, trimmed || null);
      createdId = created.id; return created;
    }, () => { setLabel(''); navigate(`/orders/${createdId}`); });
  };
  const pending = <>
    {mutation.retryPending && <Button disabled={mutation.saving} onClick={() => void mutation.retry()}>Retry pending action</Button>}
    {(error || mutation.refreshRequired) && <Button disabled={mutation.saving} onClick={() => { setError(null); void mutation.refresh(); }}>Refresh checks</Button>}
  </>;
  // Separate checks off (Configurations): the original one-order-per-session flow. A visit that already has several
  // checks from before the switch was turned off is still listed so each can be finished.
  if (!separateChecks && checks.length <= 1) return <Stack spacing={1}>
    {(error || mutation.error) && <Alert severity="error">{error || mutation.error}</Alert>}
    {checks.length === 1
      ? <Button variant="contained" component={Link} to={`/orders/${checks[0].id}`} disabled={disabled || mutation.saving}>Open order #{checks[0].orderNumber}</Button>
      : <Button variant="contained" disabled={!canAdd} onClick={add}>{mutation.saving ? 'Starting order…' : 'Start order'}</Button>}
    {pending}
  </Stack>;
  return <Stack spacing={1}>
    <Typography variant="subtitle2">Checks</Typography>
    {(error || mutation.error) && <Alert severity="error">{error || mutation.error}</Alert>}
    {!separateChecks && <Typography variant="body2" color="text.secondary">Separate checks are turned off. Finish these checks; no new ones can be added.</Typography>}
    {loading ? <CircularProgress size={20} aria-label="Loading checks" /> : checks.length === 0
      ? <Typography variant="body2" color="text.secondary">No checks yet. Add one for the table, or one per guest who pays separately.</Typography>
      : <List dense disablePadding>{checks.map(check =>
        <ListItemButton key={check.id} component={Link} to={`/orders/${check.id}`} disabled={disabled || mutation.saving}>
          <ListItemText primary={checkName(check)}
            secondary={`${formatAmount(check.subtotal)}${check.billingStatus != null ? ` · ${billStatusLabels[check.billingStatus]}` : ''}`} />
          <Chip size="small" label={orderStatusLabels[check.status]} color={isActiveOrderStatus(check.status) ? 'primary' : 'default'} />
        </ListItemButton>)}</List>}
    {separateChecks && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
      <TextField size="small" label="Check label (optional)" placeholder={`e.g. Guest ${checks.length + 1}`} value={label}
        onChange={e => setLabel(e.target.value)} error={tooLong} helperText={tooLong ? `Up to ${checkLabelMaxLength} characters` : undefined}
        disabled={disabled || mutation.saving} onKeyDown={e => { if (e.key === 'Enter' && canAdd) add(); }} />
      <Button variant="contained" disabled={!canAdd} onClick={add}>{mutation.saving ? 'Adding check…' : checks.length === 0 ? 'Start order' : 'Add check'}</Button>
    </Stack>}
    {pending}
  </Stack>;
}
