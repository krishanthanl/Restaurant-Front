import { useRef, useState } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { Order } from '../types/orderTypes';

type Pending = { task: () => Promise<Order>; onSuccess?: () => void };

// Ambiguous failures keep the exact payload/operation ID; retry must not create a second write.
export function useOrderMutation(reload: () => Promise<void>) {
  const lock = useRef(false);
  const pending = useRef<Pending | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const execute = async (request: Pending) => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setError(null);
    try {
      await request.task();
      pending.current = null; setRetryPending(false);
      request.onSuccess?.();
      try { await reload(); setRefreshRequired(false); }
      catch (e) { setRefreshRequired(true); setError(`Saved. Refresh current data before continuing. ${getApiErrorMessage(e)}`); }
    } catch (e) {
      setError(getApiErrorMessage(e));
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      const ambiguous = status === undefined || status >= 500 || status === 408;
      pending.current = ambiguous ? request : null; setRetryPending(ambiguous);
      try { await reload(); setRefreshRequired(false); }
      catch { setRefreshRequired(true); }
    } finally { lock.current = false; setSaving(false); }
  };
  return {
    saving, error, retryPending, refreshRequired,
    blocked: saving || retryPending || refreshRequired,
    run(task: () => Promise<Order>, onSuccess?: () => void) {
      if (lock.current || pending.current || refreshRequired) return Promise.resolve();
      return execute({ task, onSuccess });
    },
    retry() { return pending.current ? execute(pending.current) : Promise.resolve(); },
    async refresh() {
      if (lock.current) return;
      lock.current = true; setSaving(true);
      try { await reload(); setRefreshRequired(false); }
      catch (e) { setError(getApiErrorMessage(e)); setRefreshRequired(true); }
      finally { lock.current = false; setSaving(false); }
    },
  };
}
