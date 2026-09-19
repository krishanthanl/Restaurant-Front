import { useEffect, useState } from 'react';
import { Avatar, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import type { CategoryInput, MenuCategory } from '../types/menuTypes';
import { validateCategory, type FieldErrors } from '../validation/menuValidation';

interface Props {
  open: boolean;
  category: MenuCategory | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: CategoryInput) => Promise<void>;
}

const emptyForm: CategoryInput = { name: '', description: '', imagePath: '', displayOrder: 0 };

export function CategoryFormDialog({ open, category, saving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CategoryInput>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors<CategoryInput>>({});

  useEffect(() => {
    if (open) {
      setForm(category ? { name: category.name, description: category.description ?? '', imagePath: category.imagePath ?? '', displayOrder: category.displayOrder } : emptyForm);
      setErrors({});
    }
  }, [open, category]);

  const submit = async () => {
    const validation = validateCategory(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    await onSubmit({ ...form, name: form.name.trim(), description: form.description.trim(), imagePath: form.imagePath.trim() });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{category ? 'Edit category' : 'Create category'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <TextField autoFocus label="Category name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={Boolean(errors.name)} helperText={errors.name} inputProps={{ maxLength: 101 }} />
          <TextField label="Description" multiline minRows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}
            error={Boolean(errors.description)} helperText={errors.description ?? `${form.description.length}/500`} inputProps={{ maxLength: 501 }} />
          <TextField label="Category image URL or path" placeholder="https://… or /images/category.webp" value={form.imagePath}
            onChange={(event) => setForm({ ...form, imagePath: event.target.value })} error={Boolean(errors.imagePath)}
            helperText={errors.imagePath ?? 'Optional. Use an HTTPS URL or application-relative path.'} />
          {form.imagePath && <Avatar variant="rounded" src={form.imagePath} sx={{ width: '100%', height: 150, bgcolor: 'primary.light', color: 'primary.main' }}><ImageOutlinedIcon sx={{ fontSize: 44 }} /></Avatar>}
          <TextField label="Display order" type="number" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })}
            error={Boolean(errors.displayOrder)} helperText={errors.displayOrder ?? 'Lower numbers appear first.'} inputProps={{ min: 0, step: 1 }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} loading={saving}>{category ? 'Save changes' : 'Create category'}</Button>
      </DialogActions>
    </Dialog>
  );
}
