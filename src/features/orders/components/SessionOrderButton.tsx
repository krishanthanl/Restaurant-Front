import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Stack } from '@mui/material';
import type { DiningSession } from '../../dining-sessions/types/diningSessionTypes';
import type { Order } from '../types/orderTypes';
import { orderApi } from '../api/orderApi';
import { useOrderMutation } from '../hooks/useOrderMutation';
import { getApiErrorMessage } from '../../../services/apiClient';
import { diningSessionApi } from '../../dining-sessions/api/diningSessionApi';

export function SessionOrderButton({ session, disabled }: { session: DiningSession; disabled: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [currentSession, setCurrentSession] = useState(session);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const current = await diningSessionApi.get(session.id);
    setCurrentSession(current);
    try { setOrder(await orderApi.forSession(session.id)); }
    catch (e) { if (axios.isAxiosError(e) && e.response?.status === 404) setOrder(null); else throw e; }
  }, [session.id]);
  useEffect(() => {
    const controller = new AbortController();
    setCurrentSession(session); setOrder(null);
    setLoading(true); setError(null);
    orderApi.forSession(session.id, controller.signal).then(value => { if (!controller.signal.aborted) setOrder(value); })
      .catch((e: unknown) => { if (!controller.signal.aborted && !(axios.isAxiosError(e) && e.response?.status === 404)) setError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session]);
  const mutation = useOrderMutation(reload);
  return <Stack spacing={1}>
    {(error || mutation.error) && <Alert severity="error">{error || mutation.error}</Alert>}
    {order ? <Button variant="contained" href={`/orders/${order.id}`} disabled={disabled || mutation.saving}>Open order #{order.orderNumber}</Button> :
      <Button variant="contained" disabled={disabled || loading || !!error || mutation.blocked || currentSession.status !== 0} onClick={() => {
        const operation = crypto.randomUUID();
        void mutation.run(async () => { const created = await orderApi.create(session.id, currentSession.rowVersion, operation); setOrder(created); return created; });
      }}>{mutation.saving ? 'Starting order…' : 'Start order'}</Button>}
    {mutation.retryPending && <Button disabled={mutation.saving} onClick={() => void mutation.retry()}>Retry pending action</Button>}
    {(error || mutation.refreshRequired) && <Button disabled={mutation.saving} onClick={() => { setError(null); void mutation.refresh(); }}>Refresh order</Button>}
  </Stack>;
}
