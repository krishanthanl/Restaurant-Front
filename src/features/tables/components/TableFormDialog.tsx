import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import type { Area } from '../../areas/types/areaTypes';
import { tableTypes, type RestaurantTable, type TableInput } from '../types/tableTypes';
import { validateTable, type TableFieldErrors } from '../validation/tableValidation';
interface Props {
 open: boolean; table: RestaurantTable | null; areas: Area[]; saving: boolean;
 onClose: () => void; onSubmit: (input: TableInput) => Promise<void>;
}
const emptyForm: TableInput = { areaId: '', tableNumber: '', name: '', capacity: 2, tableType: 0, displayOrder: 0, isActive: true };
export function TableFormDialog({ open, table, areas, saving, onClose, onSubmit }: Props) {
 const [form, setForm] = useState<TableInput>(emptyForm);
 const [errors, setErrors] = useState<TableFieldErrors>({});
 useEffect(() => {
  if (open) {
   setForm(table ? { areaId: table.areaId, tableNumber: table.tableNumber, name: table.name ?? '', capacity: table.capacity, tableType: table.tableType, displayOrder: table.displayOrder, isActive: table.isActive } : emptyForm);
   setErrors({});
  }
 }, [open, table]);
 const submit = async () => {
  const validation = validateTable(form);
  if (!areas.some(area => area.id === form.areaId && area.isActive)) validation.areaId = 'Select an active area.';
  setErrors(validation);
  if (Object.keys(validation).length) return;
  await onSubmit({ ...form, tableNumber: form.tableNumber.trim(), name: form.name.trim() });
 };
 return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
  <DialogTitle>{table ? 'Edit table' : 'Add table'}</DialogTitle>
  <DialogContent><Stack spacing={2.25} sx={{ pt: 1 }}>
   <TextField autoFocus required label="Table number" value={form.tableNumber} disabled={saving} onChange={event => setForm({ ...form, tableNumber: event.target.value })} error={Boolean(errors.tableNumber)} helperText={errors.tableNumber} inputProps={{ maxLength: 50 }} />
   <TextField label="Name / label" value={form.name} disabled={saving} onChange={event => setForm({ ...form, name: event.target.value })} error={Boolean(errors.name)} helperText={errors.name} inputProps={{ maxLength: 100 }} />
   <TextField select required label="Area" value={form.areaId} disabled={saving} onChange={event => setForm({ ...form, areaId: event.target.value })} error={Boolean(errors.areaId)} helperText={errors.areaId ?? 'Tables must belong to an active area.'}>
    {areas.filter(area => area.isActive || area.id === form.areaId).map(area => <MenuItem key={area.id} value={area.id} disabled={!area.isActive}>{area.name}{!area.isActive && ' (Inactive)'}</MenuItem>)}
   </TextField>
   <TextField required label="Capacity" type="number" value={Number.isNaN(form.capacity) ? '' : form.capacity} disabled={saving} onChange={event => setForm({ ...form, capacity: event.target.value === '' ? NaN : Number(event.target.value) })} error={Boolean(errors.capacity)} helperText={errors.capacity} inputProps={{ min: 1, step: 1, max: 2147483647 }} />
   <TextField select label="Type" value={form.tableType} disabled={saving} onChange={event => setForm({ ...form, tableType: Number(event.target.value) })}>{tableTypes.map((label, value) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
   <TextField label="Display order" type="number" value={Number.isNaN(form.displayOrder) ? '' : form.displayOrder} disabled={saving} onChange={event => setForm({ ...form, displayOrder: event.target.value === '' ? NaN : Number(event.target.value) })} error={Boolean(errors.displayOrder)} helperText={errors.displayOrder ?? 'Lower numbers appear first.'} inputProps={{ min: 0, step: 1, max: 2147483647 }} />
   {!table && <FormControlLabel label="Active" control={<Switch checked={form.isActive} disabled={saving} onChange={event => setForm({ ...form, isActive: event.target.checked })} />} />}
  </Stack></DialogContent>
  <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void submit()} loading={saving}>{table ? 'Save changes' : 'Create table'}</Button></DialogActions>
 </Dialog>;
}
