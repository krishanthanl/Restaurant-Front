import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { FeedbackSnackbar, type Feedback } from '../../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../../services/apiClient';
import { kitchenApi } from '../api/kitchenApi';
import { KitchenFormDialog } from '../components/KitchenFormDialog';
import type { Kitchen, KitchenFilter, KitchenInput } from '../types/kitchenTypes';
import { useAuth } from '../../authentication/useAuth';
import { Permissions } from '../../authentication/permissions';

export function KitchenManagementPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permissions.menuManage);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [filter, setFilter] = useState<KitchenFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Kitchen | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Kitchen | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  // `saving` disables buttons only after a re-render; the ref also blocks a second click that lands before it.
  const inFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    kitchenApi.getKitchens(filter, controller.signal).then((data) => {
      if (!controller.signal.aborted) setKitchens(data);
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [filter, revision]);

  const submit = async (input: KitchenInput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      if (editing) await kitchenApi.updateKitchen(editing, input);
      else await kitchenApi.createKitchen(input);
      setFeedback({ severity: 'success', message: editing ? 'Kitchen updated.' : 'Kitchen created.' });
      setFormOpen(false); setEditing(null); reload();
    } catch (submitError) { setFeedback({ severity: 'error', message: getApiErrorMessage(submitError) }); }
    finally { inFlight.current = false; setSaving(false); }
  };

  const changeStatus = async () => {
    if (!statusTarget || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await kitchenApi.setKitchenStatus(statusTarget, !statusTarget.isActive);
      setFeedback({ severity: 'success', message: `Kitchen ${statusTarget.isActive ? 'deactivated' : 'activated'}.` });
      setStatusTarget(null); reload();
    } catch (statusError) {
      // Reload so a retry uses the current row version and active item count.
      setFeedback({ severity: 'error', message: getApiErrorMessage(statusError) }); setStatusTarget(null); reload();
    } finally { inFlight.current = false; setSaving(false); }
  };

  const addKitchen = () => { setEditing(null); setFormOpen(true); };

  return (
    <>
      <PageHeader eyebrow="Menu setup" title="Kitchens" description="Manage the kitchens and preparation stations that make your menu items."
        action={canManage ? <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={addKitchen} disabled={saving}>Add kitchen</Button> : undefined} />
      <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <TextField select label="Status" value={filter} disabled={saving} onChange={(event) => setFilter(event.target.value as KitchenFilter)} sx={{ mb: 3, minWidth: 180 }}>
          <MenuItem value="all">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        {loading ? <LoadingState label="Loading kitchens…" /> : error ? <ErrorState message={error} onRetry={reload} /> : kitchens.length === 0 ?
          <EmptyState title={filter === 'all' ? 'No kitchens yet' : `No ${filter} kitchens`} description="Add kitchens such as Hot Kitchen, Bar, or Pastry, then assign menu items to them."
            action={canManage ? <Button variant="contained" onClick={addKitchen}>Add kitchen</Button> : undefined} /> :
          <TableContainer><Table aria-label="Kitchens">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Description</TableCell><TableCell>Active items</TableCell><TableCell>Display order</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{kitchens.map((kitchen) => <TableRow key={kitchen.id}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>{kitchen.name}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{kitchen.code}</TableCell>
              <TableCell sx={{ maxWidth: 380, overflowWrap: 'anywhere' }}>{kitchen.description || '—'}</TableCell>
              <TableCell>{kitchen.activeMenuItemCount}</TableCell>
              <TableCell>{kitchen.displayOrder}</TableCell>
              <TableCell><Chip size="small" label={kitchen.isActive ? 'Active' : 'Inactive'} color={kitchen.isActive ? 'success' : 'default'} /></TableCell>
              <TableCell align="right">{canManage && <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button disabled={saving} aria-label={`Edit ${kitchen.name}`} onClick={() => { setEditing(kitchen); setFormOpen(true); }}>Edit</Button>
                <Button disabled={saving} color={kitchen.isActive ? 'warning' : 'primary'} aria-label={`${kitchen.isActive ? 'Deactivate' : 'Activate'} ${kitchen.name}`}
                  onClick={() => setStatusTarget(kitchen)}>{kitchen.isActive ? 'Deactivate' : 'Activate'}</Button>
              </Stack>}</TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer>}
      </CardContent></Card>
      <KitchenFormDialog open={formOpen} kitchen={editing} saving={saving} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={submit} />
      <Dialog open={Boolean(statusTarget)} onClose={() => !saving && setStatusTarget(null)}>
        <DialogTitle>{statusTarget?.isActive ? 'Deactivate kitchen?' : 'Activate kitchen?'}</DialogTitle>
        <DialogContent><Typography color="text.secondary">{statusTarget?.isActive
          ? statusTarget.activeMenuItemCount > 0
            ? `${statusTarget.name} still prepares ${statusTarget.activeMenuItemCount} active menu item(s). Reassign or deactivate them first.`
            : `${statusTarget.name} will no longer be available for menu items. You can reactivate it later.`
          : `${statusTarget?.name} will be available for menu items again.`}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setStatusTarget(null)} disabled={saving}>Cancel</Button><Button variant="contained" color={statusTarget?.isActive ? 'warning' : 'primary'} loading={saving} onClick={() => void changeStatus()}>Confirm</Button></DialogActions>
      </Dialog>
      <FeedbackSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}
