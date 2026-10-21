import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import type { Kitchen, KitchenInput } from '../types/kitchenTypes';
import { validateKitchen, type KitchenFieldErrors } from '../validation/kitchenValidation';

interface Props {
  open: boolean;
  kitchen: Kitchen | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: KitchenInput) => Promise<void>;
}

const emptyForm: KitchenInput = { name: '', code: '', description: '', displayOrder: 0, isActive: true };

export function KitchenFormDialog({ open, kitchen, saving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<KitchenInput>(emptyForm);
  const [errors, setErrors] = useState<KitchenFieldErrors>({});

  useEffect(() => {
    if (open) {
      setForm(kitchen ? { name: kitchen.name, code: kitchen.code, description: kitchen.description ?? '', displayOrder: kitchen.displayOrder, isActive: kitchen.isActive } : emptyForm);
      setErrors({});
    }
  }, [open, kitchen]);

  const submit = async () => {
    const validation = validateKitchen(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    await onSubmit({ ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description.trim() });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{kitchen ? 'Edit kitchen' : 'Add kitchen'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <TextField autoFocus required label="Kitchen name" value={form.name} disabled={saving}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={Boolean(errors.name)} helperText={errors.name} inputProps={{ maxLength: 100 }} />
          <TextField required label="Code" value={form.code} disabled={saving}
            onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            error={Boolean(errors.code)} helperText={errors.code ?? 'Short label for kitchen tickets, e.g. HOT or BAR.'} inputProps={{ maxLength: 20 }} />
          <TextField label="Description" multiline minRows={3} value={form.description} disabled={saving}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            error={Boolean(errors.description)} helperText={errors.description ?? `${form.description.length}/500`} inputProps={{ maxLength: 500 }} />
          <TextField label="Display order" type="number" value={Number.isNaN(form.displayOrder) ? '' : form.displayOrder} disabled={saving}
            onChange={(event) => setForm({ ...form, displayOrder: event.target.value === '' ? NaN : Number(event.target.value) })}
            error={Boolean(errors.displayOrder)} helperText={errors.displayOrder ?? 'Lower numbers appear first.'} inputProps={{ min: 0, step: 1, max: 2147483647 }} />
          {!kitchen && <FormControlLabel label="Active" control={<Switch checked={form.isActive} disabled={saving}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} loading={saving}>{kitchen ? 'Save changes' : 'Create kitchen'}</Button>
      </DialogActions>
    </Dialog>
  );
}
