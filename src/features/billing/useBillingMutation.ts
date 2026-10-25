import { useRef, useState } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../../services/apiClient';

// Keep an uncertain write's exact payload/operation ID so a retry cannot duplicate a payment.
export function useBillingMutation<T>(reload: () => Promise<void>, apply: (value: T) => void) {
  const lock = useRef(false);
  const pending = useRef<{ task: () => Promise<T>; saved?: () => void } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const execute = async (request: NonNullable<typeof pending.current>) => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setError(null);
    try {
      const value = await request.task(); apply(value); request.saved?.(); pending.current = null; setRetryPending(false);
      try { await reload(); setRefreshRequired(false); } catch { setRefreshRequired(true); }
    } catch (e) {
      setError(getApiErrorMessage(e));
      const uncertain = !axios.isAxiosError(e) || !e.response || e.response.status >= 500;
      pending.current = uncertain ? request : null; setRetryPending(uncertain);
      try { await reload(); setRefreshRequired(false); } catch { setRefreshRequired(true); }
    } finally { lock.current = false; setSaving(false); }
  };
  return {
    saving, error, retryPending, refreshRequired, blocked: saving || retryPending || refreshRequired,
    run(task: () => Promise<T>, saved?: () => void) { if (lock.current || pending.current || refreshRequired) return Promise.resolve(); return execute({ task, saved }); },
    retry() { return pending.current ? execute(pending.current) : Promise.resolve(); },
    async refresh() {
      if (lock.current) return;
      lock.current = true; setSaving(true);
      try { await reload(); setRefreshRequired(false); } catch (e) { setError(getApiErrorMessage(e)); setRefreshRequired(true); }
      finally { lock.current = false; setSaving(false); }
    },
  };
}
