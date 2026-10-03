import { useEffect, useState } from 'react';
import { Box, Button, Card, CardActionArea, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
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
import { tableStatuses, tableTypes, type RestaurantTable } from '../types/tableTypes';

export function TableDashboardPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'Admin' || user?.role === 'Manager';
  const canOpen = canManage || user?.role === 'Waiter';
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'close' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [guests, setGuests] = useState('1');
  const [waiterId, setWaiterId] = useState('');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [session, setSession] = useState<DiningSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const refresh = () => { setSelectedId(null); setRevision(value => value + 1); };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedId(null);
    Promise.all([
      areaApi.getAreas('all', controller.signal),
      tableApi.getTables(canManage ? 'all' : 'active', undefined, controller.signal),
    ]).then(([loadedAreas, loadedTables]) => {
      if (controller.signal.aborted) return;
      setAreas(loadedAreas.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)));
      setTables(loadedTables.sort((a, b) => a.displayOrder - b.displayOrder || a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })));
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [revision, canManage]);

  useEffect(() => {
    const controller = new AbortController();
    setSession(null); setSessionError(null); setGuests('1'); setWaiterId(''); setNotes(''); setAction(null); setReason('');
    if (!selectedId || !canOpen) return () => controller.abort();
    const table = tables.find(item => item.id === selectedId);
    setSessionLoading(true);
    const load = table?.currentStatus === 1
      ? Promise.all([diningSessionApi.active(selectedId, controller.signal), diningSessionApi.waiters(controller.signal)]).then(([value, options]) => { if (!controller.signal.aborted) { setSession(value); setWaiters(options); } })
      : diningSessionApi.waiters(controller.signal).then(value => { if (!controller.signal.aborted) setWaiters(value); });
    load.catch((e: unknown) => { if (!controller.signal.aborted) setSessionError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setSessionLoading(false); });
    return () => controller.abort();
  }, [selectedId, canOpen, tables]);

  const openSession = async () => {
    if (!selectedId) return;
    setSaving(true); setSessionError(null);
    try { await diningSessionApi.open(selectedId, Number(guests), waiterId, notes, tables.find(t => t.id === selectedId)!.rowVersion); refresh(); }
    catch (e: unknown) { setSessionError(getApiErrorMessage(e)); }
    finally { setSaving(false); }
  };
  const endSession = async () => {
    if (!session || !action) return;
    setSaving(true); setSessionError(null);
    try {
      if (action === 'cancel') await diningSessionApi.cancel(session.id, session.rowVersion, reason);
      else await diningSessionApi.close(session.id, session.rowVersion);
      setAction(null); refresh();
    } catch (e: unknown) { setSessionError(getApiErrorMessage(e)); setAction(null); }
    finally { setSaving(false); }
  };
  const saveSession = async (input: SessionInput) => {
    if (!session) return;
    setSaving(true); setSessionError(null);
    try { setSession(await diningSessionApi.update(session, input)); }
    catch (e: unknown) { setSessionError(getApiErrorMessage(e)); }
    finally { setSaving(false); }
  };
  const areaTables = tables.filter(table => !areaId || table.areaId === areaId);
  const visibleTables = areaTables.filter(table => status === 'all' || (table.isActive && table.currentStatus === Number(status)));
  const selected = !loading && !error ? tables.find(table => table.id === selectedId && table.isActive) : undefined;
  const summaries = [
    { label: 'Total tables', count: areaTables.length },
    ...tableStatuses.slice(0, 5).map((item, index) => ({ label: item.label, count: areaTables.filter(table => table.isActive && table.currentStatus === index).length })),
  ];

  return <>
    <PageHeader eyebrow="Restaurant floor" title="Table dashboard" description="Choose an area, check availability, and tap a table for details."
      action={<Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={loading} sx={{ minHeight: 48 }}>Refresh tables</Button>} />
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
                {grouped.map(table => <Card key={table.id}>
                  <CardActionArea disabled={!table.isActive} onClick={() => { if (table.isActive) setSelectedId(table.id); }} aria-label={`Table ${table.tableNumber}${!table.isActive ? ', inactive' : ''}`} sx={{ height: '100%', minHeight: 170, opacity: table.isActive ? 1 : 0.6 }}>
                    <CardContent><Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>Table {table.tableNumber}</Typography>{table.name && <Typography color="text.secondary">{table.name}</Typography>}
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
        {sessionError && <Typography role="alert" color="error">{sessionError}</Typography>}
        {sessionLoading && <Typography>Loading session details…</Typography>}
        {canOpen && selected.currentStatus === 0 && areas.find(a => a.id === selected.areaId)?.isActive &&
          <OpenDiningSessionDialog guests={guests} waiterId={waiterId} notes={notes} capacity={selected.capacity} waiters={waiters}
            disabled={saving || sessionLoading || Boolean(sessionError)} onGuests={setGuests} onWaiter={setWaiterId} onNotes={setNotes} onOpen={openSession} />}
        {session && <DiningSessionDetailsDialog key={session.rowVersion} session={session} capacity={selected.capacity} waiters={waiters}
          saving={saving} canCancel={canManage} onSave={saveSession} onAction={value => { setReason(''); setAction(value); }} />}
        {sessionError && <Button disabled={saving} onClick={refresh}>Refresh session and tables</Button>}
      </Stack>}</DialogContent>
      <DialogActions>
        <Button disabled={saving} variant="contained" onClick={() => setSelectedId(null)} sx={{ minHeight: 48 }}>Close details</Button></DialogActions>
    </Dialog>
    <DiningSessionActionDialog action={action} reason={reason} saving={saving} onReason={setReason}
      onClose={() => setAction(null)} onConfirm={endSession} />
  </>;
}
