import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { FeedbackSnackbar, type Feedback } from '../../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../../services/apiClient';
import { tableApi } from '../api/tableApi';
import { TableFormDialog } from '../components/TableFormDialog';
import { tableTypes, type RestaurantTable, type TableFilter, type TableInput } from '../types/tableTypes';

import { areaApi } from '../../areas/api/areaApi';
import type { Area } from '../../areas/types/areaTypes';
import { useAuth } from '../../authentication/useAuth';

export function TableManagementPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'Admin' || user?.role === 'Manager';
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState('');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [filter, setFilter] = useState<TableFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<RestaurantTable | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    Promise.all([tableApi.getTables(filter, areaId || undefined, controller.signal), areaApi.getAreas('all', controller.signal)]).then(([data, loadedAreas]) => {
      if (!controller.signal.aborted) { setTables(data); setAreas(loadedAreas); }
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [filter, areaId, revision]);

  const submit = async (input: TableInput) => {
    setSaving(true);
    try {
      if (editing) await tableApi.updateTable(editing, input);
      else await tableApi.createTable(input);
      setFeedback({ severity: 'success', message: editing ? 'Table updated.' : 'Table created.' });
      setFormOpen(false); setEditing(null); reload();
    } catch (submitError) { setFeedback({ severity: 'error', message: getApiErrorMessage(submitError) }); }
    finally { setSaving(false); }
  };

  const changeStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await tableApi.setTableStatus(statusTarget, !statusTarget.isActive);
      setFeedback({ severity: 'success', message: `Table ${statusTarget.isActive ? 'deactivated' : 'activated'}.` });
      setStatusTarget(null); reload();
    } catch (statusError) { setFeedback({ severity: 'error', message: getApiErrorMessage(statusError) }); }
    finally { setSaving(false); }
  };

  const addTable = () => { setEditing(null); setFormOpen(true); };

  return (
    <>
      <PageHeader eyebrow="Restaurant setup" title="Tables" description="Manage seating capacity and tables in each restaurant area."
        action={canManage && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={addTable} disabled={saving}>Add table</Button>} />
      <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <TextField select label="Area" value={areaId} disabled={saving} onChange={event => setAreaId(event.target.value)} sx={{ mb: 3, mr: 2, minWidth: 180 }}>
          <MenuItem value="">All areas</MenuItem>{areas.map(area => <MenuItem key={area.id} value={area.id}>{area.name}{!area.isActive && ' (Inactive)'}</MenuItem>)}
        </TextField>
        <TextField select label="Status" value={filter} disabled={saving} onChange={(event) => setFilter(event.target.value as TableFilter)} sx={{ mb: 3, minWidth: 180 }}>
          <MenuItem value="all">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        {loading ? <LoadingState label="Loading tables…" /> : error ? <ErrorState message={error} onRetry={reload} /> : tables.length === 0 ?
          <EmptyState title={filter === 'all' ? 'No tables yet' : `No ${filter} tables`} description="Add tables to an active restaurant area."
            action={canManage && <Button variant="contained" onClick={addTable}>Add table</Button>} /> :
          <TableContainer><Table aria-label="Restaurant tables">
            <TableHead><TableRow><TableCell>Table number</TableCell><TableCell>Area</TableCell><TableCell>Capacity</TableCell><TableCell>Type</TableCell><TableCell>Display order</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{tables.map((table) => <TableRow key={table.id}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>{table.tableNumber}{table.name && <Typography variant="caption" display="block">{table.name}</Typography>}</TableCell>
              <TableCell sx={{ maxWidth: 380, overflowWrap: 'anywhere' }}>{areas.find(area => area.id === table.areaId)?.name ?? '—'}</TableCell><TableCell>{table.capacity}</TableCell><TableCell>{tableTypes[table.tableType]}</TableCell>
              <TableCell>{table.displayOrder}</TableCell>
              <TableCell><Chip size="small" label={table.isActive ? 'Active' : 'Inactive'} color={table.isActive ? 'success' : 'default'} /></TableCell>
              <TableCell align="right">{canManage && <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button disabled={saving} aria-label={`Edit ${table.tableNumber}`} onClick={() => { setEditing(table); setFormOpen(true); }}>Edit</Button>
                <Button disabled={saving} color={table.isActive ? 'warning' : 'primary'} aria-label={`${table.isActive ? 'Deactivate' : 'Activate'} ${table.tableNumber}`}
                  onClick={() => setStatusTarget(table)}>{table.isActive ? 'Deactivate' : 'Activate'}</Button>
              </Stack>}</TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer>}
      </CardContent></Card>
      <TableFormDialog open={formOpen} table={editing} areas={areas} saving={saving} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={submit} />
      <Dialog open={Boolean(statusTarget)} onClose={() => !saving && setStatusTarget(null)}>
        <DialogTitle>{statusTarget?.isActive ? 'Deactivate table?' : 'Activate table?'}</DialogTitle>
        <DialogContent><Typography color="text.secondary">{statusTarget?.isActive ? `${statusTarget.tableNumber} will be removed from active table lists. You can reactivate it later.` : `${statusTarget?.tableNumber} will appear in active table lists again.`}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setStatusTarget(null)} disabled={saving}>Cancel</Button><Button variant="contained" color={statusTarget?.isActive ? 'warning' : 'primary'} loading={saving} onClick={() => void changeStatus()}>Confirm</Button></DialogActions>
      </Dialog>
      <FeedbackSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}
