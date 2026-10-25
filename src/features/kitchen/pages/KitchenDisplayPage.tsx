import { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { FeedbackSnackbar, type Feedback } from '../../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../../services/apiClient';
import { kitchenApi } from '../../kitchens/api/kitchenApi';
import type { Kitchen } from '../../kitchens/types/kitchenTypes';
import { kitchenTicketApi } from '../api/kitchenTicketApi';
import { KitchenTicketStatus, kitchenTicketStatusLabels, type KitchenTicket, type KitchenTicketAction } from '../types/kitchenTicketTypes';

// The display is left open at a station; it follows new tickets on its own.
const RefreshMs = 10_000;
const ClockMs = 30_000;
// Tickets waiting at least this long are highlighted so the station can catch up.
const LateAfterMinutes = 15;
const StationKey = 'kitchen-display.station';

function readStation() { try { return localStorage.getItem(StationKey) ?? ''; } catch { return ''; } }
function rememberStation(id: string) { try { localStorage.setItem(StationKey, id); } catch { /* per-device convenience only */ } }

const actionsFor = (status: number): Array<{ action: KitchenTicketAction; label: string }> =>
  status === KitchenTicketStatus.New ? [{ action: 'acknowledge', label: 'Acknowledge' }, { action: 'start', label: 'Start preparing' }]
    : status === KitchenTicketStatus.Acknowledged ? [{ action: 'start', label: 'Start preparing' }]
      : status === KitchenTicketStatus.Preparing ? [{ action: 'prepared', label: 'Mark prepared' }] : [];

export function KitchenDisplayPage() {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [kitchenId, setKitchenId] = useState(readStation);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const inFlight = useRef(false);
  const quiet = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    kitchenApi.getKitchens('active', controller.signal).then(list => {
      if (controller.signal.aborted) return;
      setKitchens(list);
      if (list.length === 0) setLoading(false);
      setKitchenId(current => list.some(k => k.id === current) ? current : list[0]?.id ?? '');
    }).catch((e: unknown) => { if (!controller.signal.aborted) { setError(getApiErrorMessage(e)); setLoading(false); } });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!kitchenId) return;
    const controller = new AbortController();
    const background = quiet.current;
    quiet.current = false;
    if (!background) { setLoading(true); setError(null); }
    kitchenTicketApi.active(kitchenId, controller.signal)
      .then(list => { if (!controller.signal.aborted) { setTickets(list); setError(null); } })
      .catch((e: unknown) => { if (!controller.signal.aborted && !background) setError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kitchenId, revision]);

  useEffect(() => {
    const refresh = window.setInterval(() => { if (!inFlight.current) { quiet.current = true; setRevision(x => x + 1); } }, RefreshMs);
    const clock = window.setInterval(() => setNow(Date.now()), ClockMs);
    return () => { window.clearInterval(refresh); window.clearInterval(clock); };
  }, []);

  const advance = async (ticket: KitchenTicket, action: KitchenTicketAction) => {
    if (inFlight.current) return;
    inFlight.current = true; setSavingId(ticket.id);
    try {
      const updated = await kitchenTicketApi.advance(ticket, action);
      setTickets(list => list.map(t => t.id === updated.id ? updated : t));
    } catch (e: unknown) {
      setFeedback({ message: getApiErrorMessage(e), severity: 'error' });
      quiet.current = true; setRevision(x => x + 1);
    } finally { inFlight.current = false; setSavingId(null); }
  };

  const station = kitchens.find(k => k.id === kitchenId);
  return <>
    <PageHeader eyebrow="Kitchen" title="Kitchen display" description="Tickets for the selected station, oldest first. Waiters mark prepared food as served."
      action={<TextField select label="Station" value={kitchenId} onChange={e => { setKitchenId(e.target.value); rememberStation(e.target.value); }}
        sx={{ minWidth: 220 }}>
        {kitchens.map(k => <MenuItem key={k.id} value={k.id}>{k.name} ({k.code})</MenuItem>)}
      </TextField>} />
    {loading ? <LoadingState label="Loading tickets…" /> : error ? <ErrorState message={error} onRetry={() => setRevision(x => x + 1)} /> :
      !station ? <EmptyState title="No active kitchens" description="Add a kitchen before using the display." /> :
        tickets.length === 0 ? <EmptyState title="No tickets" description={`${station.name} has nothing to prepare right now.`} /> :
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
            {tickets.map(ticket => {
              const minutes = Math.max(0, Math.floor((now - new Date(ticket.sentAtUtc).getTime()) / 60_000));
              const late = minutes >= LateAfterMinutes && ticket.status !== KitchenTicketStatus.Prepared;
              return <Card key={ticket.id} component="article" aria-label={`Order ${ticket.orderNumber} ticket ${ticket.ticketNumber}`}
                sx={{ borderLeft: 6, borderColor: late ? 'error.main' : ticket.status === KitchenTicketStatus.Prepared ? 'success.main' : 'divider' }}>
                <CardContent><Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Order #{ticket.orderNumber}</Typography>
                    <Chip label={kitchenTicketStatusLabels[ticket.status] ?? 'Unknown'} color={ticket.status === KitchenTicketStatus.Prepared ? 'success' : 'default'} />
                  </Stack>
                  <Typography color="text.secondary">Tables {ticket.tables.map(t => t.tableNumber).join(' + ') || '—'} · Ticket {ticket.ticketNumber}</Typography>
                  <Typography color={late ? 'error' : 'text.secondary'}>{minutes} min since sent{late ? ' · late' : ''}</Typography>
                  <Box component="ul" sx={{ pl: 2, my: 0 }}>
                    {ticket.lines.map(line => <li key={line.id}>
                      <Typography sx={{ textDecoration: line.isVoided ? 'line-through' : undefined }}>
                        {line.quantity} × {line.name}{line.isVoided ? ' (voided)' : ''}
                      </Typography>
                      {line.notes && <Typography variant="body2" color="warning.main">{line.notes}</Typography>}
                    </li>)}
                  </Box>
                  {ticket.orderNotes && <Typography variant="body2">Order notes: {ticket.orderNotes}</Typography>}
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {actionsFor(ticket.status).map(({ action, label }) =>
                      <Button key={action} variant={action === 'acknowledge' ? 'outlined' : 'contained'} disabled={savingId !== null}
                        onClick={() => void advance(ticket, action)}>{label}</Button>)}
                    {ticket.status === KitchenTicketStatus.Prepared && <Typography color="success.main">Waiting to be served</Typography>}
                  </Stack>
                </Stack></CardContent>
              </Card>;
            })}
          </Box>}
    <FeedbackSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
  </>;
}
