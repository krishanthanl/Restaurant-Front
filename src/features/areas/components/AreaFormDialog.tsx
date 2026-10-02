import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import type { Area, AreaInput } from '../types/areaTypes';
import { validateArea, type AreaFieldErrors } from '../validation/areaValidation';

interface Props {
  open: boolean;
  area: Area | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: AreaInput) => Promise<void>;
}

const emptyForm: AreaInput = { name: '', description: '', displayOrder: 0, isActive: true };

export function AreaFormDialog({ open, area, saving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<AreaInput>(emptyForm);
  const [errors, setErrors] = useState<AreaFieldErrors>({});

  useEffect(() => {
    if (open) {
      setForm(area ? { name: area.name, description: area.description ?? '', displayOrder: area.displayOrder, isActive: area.isActive } : emptyForm);
      setErrors({});
    }
  }, [open, area]);

  const submit = async () => {
    const validation = validateArea(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    await onSubmit({ ...form, name: form.name.trim(), description: form.description.trim() });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{area ? 'Edit area' : 'Add area'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <TextField autoFocus required label="Area name" value={form.name} disabled={saving}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={Boolean(errors.name)} helperText={errors.name} inputProps={{ maxLength: 100 }} />
          <TextField label="Description" multiline minRows={3} value={form.description} disabled={saving}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            error={Boolean(errors.description)} helperText={errors.description ?? `${form.description.length}/500`} inputProps={{ maxLength: 500 }} />
          <TextField label="Display order" type="number" value={Number.isNaN(form.displayOrder) ? '' : form.displayOrder} disabled={saving}
            onChange={(event) => setForm({ ...form, displayOrder: event.target.value === '' ? NaN : Number(event.target.value) })}
            error={Boolean(errors.displayOrder)} helperText={errors.displayOrder ?? 'Lower numbers appear first.'} inputProps={{ min: 0, step: 1, max: 2147483647 }} />
          {!area && <FormControlLabel label="Active" control={<Switch checked={form.isActive} disabled={saving}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} loading={saving}>{area ? 'Save changes' : 'Create area'}</Button>
      </DialogActions>
    </Dialog>
  );
}
