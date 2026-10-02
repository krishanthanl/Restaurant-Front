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
import { areaApi } from '../api/areaApi';
import { AreaFormDialog } from '../components/AreaFormDialog';
import type { Area, AreaFilter, AreaInput } from '../types/areaTypes';

export function AreaManagementPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [filter, setFilter] = useState<AreaFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Area | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Area | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    areaApi.getAreas(filter, controller.signal).then((data) => {
      if (!controller.signal.aborted) setAreas(data);
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [filter, revision]);

  const submit = async (input: AreaInput) => {
    setSaving(true);
    try {
      if (editing) await areaApi.updateArea(editing, input);
      else await areaApi.createArea(input);
      setFeedback({ severity: 'success', message: editing ? 'Area updated.' : 'Area created.' });
      setFormOpen(false); setEditing(null); reload();
    } catch (submitError) { setFeedback({ severity: 'error', message: getApiErrorMessage(submitError) }); }
    finally { setSaving(false); }
  };

  const changeStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await areaApi.setAreaStatus(statusTarget, !statusTarget.isActive);
      setFeedback({ severity: 'success', message: `Area ${statusTarget.isActive ? 'deactivated' : 'activated'}.` });
      setStatusTarget(null); reload();
    } catch (statusError) { setFeedback({ severity: 'error', message: getApiErrorMessage(statusError) }); }
    finally { setSaving(false); }
  };

  const addArea = () => { setEditing(null); setFormOpen(true); };

  return (
    <>
      <PageHeader eyebrow="Restaurant setup" title="Areas" description="Manage the physical sections of your restaurant."
        action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={addArea} disabled={saving}>Add area</Button>} />
      <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <TextField select label="Status" value={filter} disabled={saving} onChange={(event) => setFilter(event.target.value as AreaFilter)} sx={{ mb: 3, minWidth: 180 }}>
          <MenuItem value="all">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        {loading ? <LoadingState label="Loading areas…" /> : error ? <ErrorState message={error} onRetry={reload} /> : areas.length === 0 ?
          <EmptyState title={filter === 'all' ? 'No areas yet' : `No ${filter} areas`} description="Add areas such as Main Hall, Outdoor, or VIP."
            action={<Button variant="contained" onClick={addArea}>Add area</Button>} /> :
          <TableContainer><Table aria-label="Restaurant areas">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Description</TableCell><TableCell>Display order</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{areas.map((area) => <TableRow key={area.id}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>{area.name}</TableCell>
              <TableCell sx={{ maxWidth: 380, overflowWrap: 'anywhere' }}>{area.description || '—'}</TableCell>
              <TableCell>{area.displayOrder}</TableCell>
              <TableCell><Chip size="small" label={area.isActive ? 'Active' : 'Inactive'} color={area.isActive ? 'success' : 'default'} /></TableCell>
              <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button disabled={saving} aria-label={`Edit ${area.name}`} onClick={() => { setEditing(area); setFormOpen(true); }}>Edit</Button>
                <Button disabled={saving} color={area.isActive ? 'warning' : 'primary'} aria-label={`${area.isActive ? 'Deactivate' : 'Activate'} ${area.name}`}
                  onClick={() => setStatusTarget(area)}>{area.isActive ? 'Deactivate' : 'Activate'}</Button>
              </Stack></TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer>}
      </CardContent></Card>
      <AreaFormDialog open={formOpen} area={editing} saving={saving} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={submit} />
      <Dialog open={Boolean(statusTarget)} onClose={() => !saving && setStatusTarget(null)}>
        <DialogTitle>{statusTarget?.isActive ? 'Deactivate area?' : 'Activate area?'}</DialogTitle>
        <DialogContent><Typography color="text.secondary">{statusTarget?.isActive ? `${statusTarget.name} will be removed from active area lists. You can reactivate it later.` : `${statusTarget?.name} will appear in active area lists again.`}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setStatusTarget(null)} disabled={saving}>Cancel</Button><Button variant="contained" color={statusTarget?.isActive ? 'warning' : 'primary'} loading={saving} onClick={() => void changeStatus()}>Confirm</Button></DialogActions>
      </Dialog>
      <FeedbackSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}
