import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Card, CardContent, FormControl, FormControlLabel, InputAdornment,
  InputLabel, MenuItem as SelectOption, Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { PageHeader } from '../../../components/PageHeader';
import { ErrorState, LoadingState } from '../../../components/ContentState';
import { getApiErrorMessage } from '../../../services/apiClient';
import { menuApi } from '../api/menuApi';
import type { MenuCategory, MenuItem, MenuItemInput } from '../types/menuTypes';
import { validateMenuItem, type FieldErrors } from '../validation/menuValidation';
import { kitchenApi } from '../../kitchens/api/kitchenApi';
import type { Kitchen } from '../../kitchens/types/kitchenTypes';

const emptyForm: MenuItemInput = { name: '', description: '', price: '', categoryId: '', kitchenId: '', imagePath: '', isAvailable: true };

export function MenuItemFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState<MenuItemInput>(emptyForm);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [errors, setErrors] = useState<FieldErrors<MenuItemInput>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setLoadError(null);
      try {
        const [categoryResult, kitchenResult, itemResult] = await Promise.all([
          menuApi.getCategories(true), kitchenApi.getKitchens('all'), id ? menuApi.getItem(id) : Promise.resolve(null)]);
        if (!active) return;
        setCategories(categoryResult);
        setKitchens(kitchenResult);
        setItem(itemResult);
        if (itemResult) setForm({ name: itemResult.name, description: itemResult.description ?? '', price: itemResult.price.toFixed(2), categoryId: itemResult.categoryId, kitchenId: itemResult.kitchenId, imagePath: itemResult.imagePath ?? '', isAvailable: itemResult.isAvailable });
        else {
          // Preselect the kitchen when there is only one choice, to save a step.
          const activeKitchens = kitchenResult.filter((kitchen) => kitchen.isActive);
          if (activeKitchens.length === 1) setForm((current) => ({ ...current, kitchenId: activeKitchens[0].id }));
        }
      } catch (error) { if (active) setLoadError(getApiErrorMessage(error)); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  const selectableCategories = useMemo(() => categories.filter((category) => category.isActive || category.id === item?.categoryId), [categories, item]);
  const selectableKitchens = useMemo(() => kitchens.filter((kitchen) => kitchen.isActive || kitchen.id === item?.kitchenId), [kitchens, item]);
  const hasActiveKitchen = kitchens.some((kitchen) => kitchen.isActive);
  const keepsInactiveKitchen = kitchens.some((kitchen) => kitchen.id === form.kitchenId && !kitchen.isActive);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitError(null);
    const validation = validateMenuItem(form); setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      if (item && id) await menuApi.updateItem(id, form, item.rowVersion);
      else await menuApi.createItem(form);
      navigate('/menu/items', { replace: true, state: { success: editing ? 'Menu item updated.' : 'Menu item created.' } });
    } catch (error) { setSubmitError(getApiErrorMessage(error)); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingState label={editing ? 'Loading menu item…' : 'Preparing form…'} />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;

  return (
    <>
      <PageHeader eyebrow="Menu catalog" title={editing ? 'Edit menu item' : 'Create menu item'} description={editing ? 'Update dish details, pricing, category, or kitchen.' : 'Add a new dish to your restaurant menu.'}
        action={<Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/menu/items')}>Back to items</Button>} />
      <Box component="form" onSubmit={submit} noValidate>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(280px, .75fr)' }, gap: 3 }}>
          <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Typography variant="h6" mb={2.5}>Item details</Typography><Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            {selectableCategories.length === 0 && <Alert severity="warning" action={<Button color="inherit" onClick={() => navigate('/menu/categories')}>Manage categories</Button>}>Create and activate a category before adding menu items.</Alert>}
            <TextField label="Item name" autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={Boolean(errors.name)} helperText={errors.name} />
            <TextField label="Description" multiline minRows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} error={Boolean(errors.description)} helperText={errors.description ?? `${form.description.length}/1000`} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Price" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} error={Boolean(errors.price)} helperText={errors.price} InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }} inputProps={{ inputMode: 'decimal' }} />
              <FormControl fullWidth error={Boolean(errors.categoryId)}><InputLabel id="menu-item-category-label">Category</InputLabel><Select labelId="menu-item-category-label" label="Category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{selectableCategories.map((category) => <SelectOption key={category.id} value={category.id} disabled={!category.isActive}>{category.name}{!category.isActive ? ' (inactive)' : ''}</SelectOption>)}</Select><Typography variant="caption" color={errors.categoryId ? 'error' : 'text.secondary'} sx={{ mt: .5, ml: 1.75 }}>{errors.categoryId ?? 'Items must belong to an active category.'}</Typography></FormControl>
            </Stack>
            {!hasActiveKitchen && <Alert severity="warning" action={<Button color="inherit" onClick={() => navigate('/menu/kitchens')}>Manage kitchens</Button>}>Create and activate a kitchen before adding menu items.</Alert>}
            <FormControl fullWidth error={Boolean(errors.kitchenId)}>
              <InputLabel id="menu-item-kitchen-label">Kitchen</InputLabel>
              <Select labelId="menu-item-kitchen-label" label="Kitchen" value={form.kitchenId} onChange={(event) => setForm({ ...form, kitchenId: event.target.value })}>
                {selectableKitchens.map((kitchen) => <SelectOption key={kitchen.id} value={kitchen.id} disabled={!kitchen.isActive}>{kitchen.name}{!kitchen.isActive ? ' (inactive)' : ''}</SelectOption>)}
              </Select>
              <Typography variant="caption" color={errors.kitchenId || keepsInactiveKitchen ? 'error' : 'text.secondary'} sx={{ mt: .5, ml: 1.75 }}>{errors.kitchenId
                ?? (keepsInactiveKitchen ? 'This kitchen is inactive, so the item cannot be ordered. Choose an active kitchen.' : 'The kitchen that prepares this item when it is ordered.')}</Typography>
            </FormControl>
            <TextField label="Image URL or path" placeholder="https://… or /images/item.webp" value={form.imagePath} onChange={(event) => setForm({ ...form, imagePath: event.target.value })} error={Boolean(errors.imagePath)} helperText={errors.imagePath ?? 'HTTPS URLs and application-relative paths are supported.'} />
            {!editing && <FormControlLabel control={<Switch checked={form.isAvailable} onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })} />} label="Available for ordering" />}
            <Stack direction="row" justifyContent="flex-end" spacing={1.5} pt={1}><Button onClick={() => navigate('/menu/items')} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" startIcon={<SaveRoundedIcon />} loading={saving} disabled={selectableCategories.length === 0 || (!editing && !hasActiveKitchen)}>{editing ? 'Save changes' : 'Create item'}</Button></Stack>
          </Stack></CardContent></Card>
          <Card sx={{ alignSelf: 'start', position: { lg: 'sticky' }, top: { lg: 104 } }}><CardContent sx={{ p: 3 }}><Typography variant="h6" mb={2}>Preview</Typography><Box sx={{ bgcolor: 'background.default', borderRadius: 3, p: 2, textAlign: 'center' }}><Avatar variant="rounded" src={form.imagePath || undefined} sx={{ width: '100%', height: 210, bgcolor: 'primary.light', color: 'primary.main', mb: 2 }}><ImageOutlinedIcon sx={{ fontSize: 54 }} /></Avatar><Typography variant="h6">{form.name || 'Menu item name'}</Typography><Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, my: 1 }}>{form.description || 'Your item description will appear here.'}</Typography><Typography variant="h5" color="primary.dark">Rs. {Number(form.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box></CardContent></Card>
        </Box>
      </Box>
    </>
  );
}
