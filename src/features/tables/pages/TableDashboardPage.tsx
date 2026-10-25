import { useEffect, useRef, useState } from 'react';
import { Box, Checkbox, Button, Card, CardActionArea, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { Permissions } from '../../authentication/permissions';
import { amber, lightBlue } from '@mui/material/colors';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { FeedbackSnackbar, type Feedback } from '../../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../../services/apiClient';
import { useAuth } from '../../authentication/useAuth';
import { areaApi } from '../../areas/api/areaApi';
import type { Area } from '../../areas/types/areaTypes';
import { diningSessionApi, type DiningSession, type Waiter } from '../../dining-sessions/api/diningSessionApi';
import { OpenDiningSessionDialog } from '../../dining-sessions/components/OpenDiningSessionDialog';
import { DiningSessionDetailsDialog } from '../../dining-sessions/components/DiningSessionDetailsDialog';
import { DiningSessionActionDialog } from '../../dining-sessions/components/DiningSessionActionDialog';
import type { SessionInput } from '../../dining-sessions/types/diningSessionTypes';
import { tableApi } from '../api/tableApi';
import { TableStatus, tableStatuses, tableTypes, type RestaurantTable } from '../types/tableTypes';
import { SessionOrderButton } from '../../orders/components/SessionOrderButton';

// Other devices change the floor too; refresh it in the background while no dialog is open.
const FloorRefreshMs = 20_000;

export function TableDashboardPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permissions.tablesManage);
  const canOpen = hasPermission(Permissions.ordersCreate);
  const [combineOpen, setCombineOpen] = useState(false);
  const [combineArea, setCombineArea] = useState('');
  const [combineGuests, setCombineGuests] = useState('1');
  const [combineIds, setCombineIds] = useState<string[]>([]);
  const [combineError, setCombineError] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<DiningSession[]>([]);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'close' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [guests, setGuests] = useState('1');
  const [waiterId, setWaiterId] = useState('');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [session, setSession] = useState<DiningSession | null>(null);
  const [sessionHasOrder, setSessionHasOrder] = useState<boolean | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  // Failure of an open/close/cancel on the selected table; kept across the reload that follows it.
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const inFlight = useRef(false);
  // Background refreshes keep the current floor on screen instead of a loading or error state.
  const quietReload = useRef(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const combinedCapacity = tables.filter(t => combineIds.includes(t.id)).reduce((sum, t) => sum + t.capacity, 0);
  // reload keeps the selected table's dialog open; refresh also closes it.
  const reload = () => setRevision(value => value + 1);
  const refresh = () => { setSelectedId(null); reload(); };
  // saving disables buttons only after a re-render, so the ref also stops a fast double click from sending twice.
  const guarded = async (work: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setSaving(true);
    try { await work(); } finally { inFlight.current = false; setSaving(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    const quiet = quietReload.current;
    quietReload.current = false;
    if (!quiet) { setLoading(true); setError(null); }
    Promise.all([
      areaApi.getAreas('all', controller.signal),
      tableApi.getTables(canManage ? 'all' : 'active', undefined, controller.signal),
      canOpen ? diningSessionApi.list(undefined, undefined, controller.signal) : Promise.resolve([]),
    ]).then(([loadedAreas, loadedTables, sessions]) => {
      if (controller.signal.aborted) return;
      setActiveSessions(sessions);
      setAreas(loadedAreas.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)));
      setTables(loadedTables.sort((a, b) => a.displayOrder - b.displayOrder || a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })));
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted && !quiet) setError(getApiErrorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [revision, canManage, canOpen]);

  useEffect(() => {
    if (selectedId || combineOpen || action || loading || error) return;
    const poll = () => { if (document.visibilityState === 'visible') { quietReload.current = true; setRevision(value => value + 1); } };
    const timer = window.setInterval(poll, FloorRefreshMs);
    window.addEventListener('focus', poll);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', poll); };
  }, [selectedId, combineOpen, action, loading, error]);

  // Drop selected tables that are no longer available after a reload, so a retry doesn't resend them.
  useEffect(() => {
    setCombineIds(ids => {
      const kept = ids.filter(id => tables.some(t => t.id === id && t.isActive && t.currentStatus === TableStatus.Available));
      return kept.length === ids.length ? ids : kept;
    });
  }, [tables]);

  useEffect(() => { setGuests('1'); setWaiterId(''); setNotes(''); setAction(null); setReason(''); setActionError(null); }, [selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    setSession(null); setSessionHasOrder(null); setSessionError(null);
    if (!selectedId || !canOpen) return () => controller.abort();
    const table = tables.find(item => item.id === selectedId);
    setSessionLoading(true);
    const load = table?.currentStatus === TableStatus.Occupied
      ? Promise.all([diningSessionApi.active(selectedId, controller.signal), diningSessionApi.waiters(controller.signal)]).then(([value, options]) => { if (!controller.signal.aborted) { setSession(value); setWaiters(options); } })
      : diningSessionApi.waiters(controller.signal).then(value => { if (!controller.signal.aborted) setWaiters(value); });
    load.catch((e: unknown) => { if (!controller.signal.aborted) setSessionError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setSessionLoading(false); });
    return () => controller.abort();
  }, [selectedId, canOpen, tables]);

  // The table stays open after opening so the order can be started straight away; after a failure the
  // reload brings the table's current version for the retry.
  const openSession = () => guarded(async () => {
    if (!selectedId) return;
    setActionError(null);
    try { await diningSessionApi.open(selectedId, Number(guests), waiterId, notes, tables.find(t => t.id === selectedId)!.rowVersion); }
    catch (e: unknown) { setActionError(getApiErrorMessage(e)); }
    reload();
  });
  const openCombined = () => guarded(async () => {
    setCombineError(null);
    try {
      await diningSessionApi.openCombined(combineArea, combineIds, Number(combineGuests));
      setCombineOpen(false); setFeedback({ message: 'Dining session opened.', severity: 'success' }); refresh();
    } catch (e: unknown) { setCombineError(getApiErrorMessage(e)); reload(); }
  });
  const endSession = () => guarded(async () => {
    if (!session || !action) return;
    setActionError(null);
    try {
      if (action === 'cancel') await diningSessionApi.cancel(session.id, session.rowVersion, reason);
      else await diningSessionApi.close(session.id, session.rowVersion, reason);
      setAction(null); setFeedback({ message: action === 'cancel' ? 'Dining session cancelled.' : 'Dining session closed.', severity: 'success' }); refresh();
    } catch (e: unknown) { setAction(null); setActionError(getApiErrorMessage(e)); reload(); }
  });
  const markReady = (table: RestaurantTable) => guarded(async () => {
    setActionError(null);
    try { await tableApi.markReady(table); }
    catch (e: unknown) { setActionError(getApiErrorMessage(e)); }
    reload();
  });
  const saveSession = (input: SessionInput) => guarded(async () => {
    if (!session) return;
    setSessionError(null);
    try {
      const updated = await diningSessionApi.update(session, input);
      setSession(updated); setActiveSessions(list => list.map(item => item.id === updated.id ? updated : item));
    } catch (e: unknown) { setSessionError(getApiErrorMessage(e)); }
  });
  const areaTables = tables.filter(table => !areaId || table.areaId === areaId);
  const visibleTables = areaTables.filter(table => status === 'all' || (table.isActive && table.currentStatus === Number(status)));
  const selected = !error ? tables.find(table => table.id === selectedId && table.isActive) : undefined;
  const summaries = [
    { label: 'Total tables', count: areaTables.length },
    ...tableStatuses.slice(0, 5).map((item, index) => ({ label: item.label, count: areaTables.filter(table => table.isActive && table.currentStatus === index).length })),
  ];

  return <>
    <PageHeader eyebrow="Restaurant floor" title="Table dashboard" description="Choose an area, check availability, and tap a table for details."
      action={<Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={loading} sx={{ minHeight: 48 }}>Refresh tables</Button>} />
    {canOpen && <Button sx={{ mb: 2 }} variant="contained" disabled={loading || Boolean(error)} onClick={() => {
      setCombineArea(''); setCombineGuests('1'); setCombineIds([]); setCombineError(null); setCombineOpen(true);
    }}>Open dining session / combine tables</Button>}
    <Dialog open={combineOpen} onClose={() => { if (!saving) setCombineOpen(false); }} fullWidth maxWidth="sm">
      <DialogTitle>Open dining session</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <TextField select label="Session area" value={combineArea} disabled={saving} onChange={e => { setCombineArea(e.target.value); setCombineIds([]); }}>
          {areas.filter(a => a.isActive).map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
        </TextField>
        {!combineArea && <Typography role="status">Select an area.</Typography>}
        <TextField label="Guest count" type="number" value={combineGuests} disabled={saving} onChange={e => setCombineGuests(e.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} />
        {tables.filter(t => t.areaId === combineArea && t.isActive && t.currentStatus === TableStatus.Available).map(t => <Box component="label" key={t.id}>
          <Checkbox checked={combineIds.includes(t.id)} disabled={saving} onChange={e => setCombineIds(ids => e.target.checked ? [...ids, t.id] : ids.filter(id => id !== t.id))} />
          {t.tableNumber} — Capacity: {t.capacity}
        </Box>)}
        <Typography>Selected tables: {tables.filter(t => combineIds.includes(t.id)).map(t => t.tableNumber).join(', ') || 'None'}</Typography>
        <Typography>Combined capacity: {combinedCapacity}</Typography>
        {!Number.isInteger(Number(combineGuests)) || Number(combineGuests) <= 0 ? <Typography role="status">Enter a positive whole guest count.</Typography> :
          combineIds.length === 0 ? <Typography role="status">Select at least one available table.</Typography> :
          Number(combineGuests) > combinedCapacity ? <Typography role="status" color="error">Not enough table capacity for {combineGuests} guests.</Typography> : <Typography>Selected tables can accommodate the guests.</Typography>}
        {combineError && <Typography role="alert" color="error">{combineError}</Typography>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={saving} onClick={() => setCombineOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={openCombined} disabled={saving || !combineArea || !combineIds.length || !Number.isInteger(Number(combineGuests)) || Number(combineGuests) <= 0 || Number(combineGuests) > combinedCapacity}>Open dining session</Button>
      </DialogActions>
    </Dialog>
    {loading ? <LoadingState label="Loading table dashboard…" /> : error ? <ErrorState message={error} onRetry={refresh} /> : <>
      <Box component="section" aria-label="Table summary" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 2, mb: 2 }}>
        {summaries.map(item => <Card key={item.label}><CardContent><Typography color="text.secondary">{item.label}</Typography><Typography variant="h4">{item.count}</Typography></CardContent></Card>)}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Counts cover {areaId ? areas.find(area => area.id === areaId)?.name : 'all areas'}. Operational counts include active tables only.</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField select label="Area" value={areaId} onChange={event => setAreaId(event.target.value)} sx={{ minWidth: 220, '& .MuiInputBase-root': { minHeight: 48 } }}>
          <MenuItem value="">All areas</MenuItem>{areas.map(area => <MenuItem key={area.id} value={area.id}>{area.name}{!area.isActive && ' (Inactive)'}</MenuItem>)}
        </TextField>
        <TextField select label="Operational status" value={status} onChange={event => setStatus(event.target.value)} sx={{ minWidth: 220, '& .MuiInputBase-root': { minHeight: 48 } }}>
          <MenuItem value="all">All statuses</MenuItem>{tableStatuses.map((item, index) => <MenuItem key={item.label} value={String(index)}>{item.label}</MenuItem>)}
        </TextField>
        {(areaId || status !== 'all') && <Button onClick={() => { setAreaId(''); setStatus('all'); }} sx={{ minHeight: 48 }}>Clear filters</Button>}
      </Stack>
      {tables.length === 0 ? <EmptyState title="No tables yet" description="Tables will appear here once they are set up for this restaurant." /> : visibleTables.length === 0 && status !== 'all' ?
        <EmptyState title="No matching tables" description="Choose another area or status, or clear the filters." /> :
        areas.filter(area => !areaId || area.id === areaId).map(area => {
          const grouped = visibleTables.filter(table => table.areaId === area.id);
          if (status !== 'all' && grouped.length === 0) return null;
          return <Box component="section" aria-label={area.name} key={area.id} sx={{ mb: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><Typography variant="h6">{area.name}</Typography>{!area.isActive && <Chip label="Inactive area" size="small" />}</Stack>
            {grouped.length === 0 ? <Typography color="text.secondary">No tables in this area.</Typography> :
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
                {grouped.map(table => <Card key={table.id} sx={{
                  backgroundColor: table.isActive && table.currentStatus === TableStatus.Available ? lightBlue[50]
                    : table.isActive && table.currentStatus === TableStatus.Occupied ? amber[50] : undefined,
                }}>
                  <CardActionArea disabled={!table.isActive} onClick={() => { if (table.isActive) setSelectedId(table.id); }} aria-label={`Table ${table.tableNumber}${!table.isActive ? ', inactive' : ''}`} sx={{ height: '100%', minHeight: 170, opacity: table.isActive ? 1 : 0.6 }}>
                    <CardContent><Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>Table {table.tableNumber}</Typography>{table.name && <Typography color="text.secondary">{table.name}</Typography>}
                      {activeSessions.filter(s => s.tableIds.includes(table.id)).map(s => <Typography key={s.id} variant="body2">Session {s.id.slice(0, 8)} · {s.guestCount} guests · {tables.filter(t => s.tableIds.includes(t.id)).map(t => t.tableNumber).join(' + ')}</Typography>)}
                      <Typography sx={{ my: 1.5 }}>Capacity: {table.capacity} guests</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><Chip label={tableStatuses[table.currentStatus]?.label ?? 'Unknown'} color={tableStatuses[table.currentStatus]?.color ?? 'default'} /><Chip label={table.isActive ? 'Active' : 'Inactive'} variant="outlined" /></Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>)}
              </Box>}
          </Box>;
        })}
    </>}
    <Dialog open={Boolean(selected)} onClose={() => { if (!saving) setSelectedId(null); }} fullWidth maxWidth="xs">
      <DialogTitle>Table {selected?.tableNumber}</DialogTitle>
      <DialogContent>{selected && <Stack spacing={2}>
        {selected.name && <Typography>{selected.name}</Typography>}
        <Typography>Area: {areas.find(area => area.id === selected.areaId)?.name ?? 'Unknown'}</Typography>
        <Typography>Capacity: {selected.capacity} guests</Typography>
        <Typography>Type: {tableTypes[selected.tableType] ?? 'Unknown'}</Typography>
        <Typography>Status: {tableStatuses[selected.currentStatus]?.label ?? 'Unknown'}</Typography>
        <Typography>Activation: Active</Typography>
        {actionError && <Typography role="alert" color="error">{actionError}</Typography>}
        {sessionError && <Typography role="alert" color="error">{sessionError}</Typography>}
        {(sessionLoading || loading) && <Typography>Loading session details…</Typography>}
        {(canOpen || canManage) && !loading && selected.currentStatus === TableStatus.Cleaning &&
          <Button variant="contained" disabled={saving} onClick={() => markReady(selected)}>Mark table ready</Button>}
        {canOpen && !loading && selected.currentStatus === TableStatus.Available && areas.find(a => a.id === selected.areaId)?.isActive &&
          <OpenDiningSessionDialog guests={guests} waiterId={waiterId} notes={notes} capacity={selected.capacity} waiters={waiters}
            disabled={saving || sessionLoading || Boolean(sessionError)} onGuests={setGuests} onWaiter={setWaiterId} onNotes={setNotes} onOpen={openSession} />}
        {session && canOpen && <SessionOrderButton session={session} disabled={saving} onHasOrder={setSessionHasOrder} />}
        {session && <DiningSessionDetailsDialog key={session.rowVersion} session={session} capacity={session.combinedCapacity ?? selected.capacity} waiters={waiters}
          saving={saving} canCancel={canManage} hasOrder={sessionHasOrder} onSave={saveSession} onAction={value => { setReason(''); setAction(value); }} />}
        {sessionError && <Button disabled={saving} onClick={reload}>Refresh session and tables</Button>}
      </Stack>}</DialogContent>
      <DialogActions>
        <Button disabled={saving} variant="contained" onClick={() => setSelectedId(null)} sx={{ minHeight: 48 }}>Close details</Button></DialogActions>
    </Dialog>
    <DiningSessionActionDialog action={action} reason={reason} saving={saving} onReason={setReason}
      onClose={() => setAction(null)} onConfirm={endSession} />
    <FeedbackSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
  </>;
}
