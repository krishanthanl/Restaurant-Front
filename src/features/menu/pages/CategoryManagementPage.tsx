import { useCallback, useEffect, useState } from 'react';
import {
  Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { FeedbackSnackbar, type Feedback } from '../../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../../services/apiClient';
import { menuApi } from '../api/menuApi';
import type { CategoryInput, MenuCategory } from '../types/menuTypes';
import { CategoryFormDialog } from '../components/CategoryFormDialog';

export function CategoryManagementPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<MenuCategory | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setCategories(await menuApi.getCategories(true)); }
    catch (loadError) { setError(getApiErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (input: CategoryInput) => {
    setSaving(true);
    try {
      if (editing) await menuApi.updateCategory(editing.id, input, editing.rowVersion);
      else await menuApi.createCategory(input);
      setFeedback({ severity: 'success', message: editing ? 'Category updated.' : 'Category created.' });
      setFormOpen(false); setEditing(null); await load();
    } catch (submitError) { setFeedback({ severity: 'error', message: getApiErrorMessage(submitError) }); }
    finally { setSaving(false); }
  };

  const changeStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await menuApi.setCategoryStatus(statusTarget, !statusTarget.isActive);
      setFeedback({ severity: 'success', message: `Category ${statusTarget.isActive ? 'deactivated' : 'activated'}.` });
      setStatusTarget(null); await load();
    } catch (statusError) { setFeedback({ severity: 'error', message: getApiErrorMessage(statusError) }); }
    finally { setSaving(false); }
  };

  const filtered = categories.filter((category) => category.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <PageHeader eyebrow="Menu setup" title="Categories" description="Organize dishes into clear, guest-friendly groups."
        action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>New category</Button>} />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <TextField fullWidth placeholder="Search categories" value={search} onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} sx={{ mb: 3, maxWidth: 480 }} />
          {loading ? <LoadingState label="Loading categories…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : filtered.length === 0 ?
            <EmptyState title={search ? 'No matching categories' : 'No categories yet'} description={search ? 'Try a different search.' : 'Create the first category to start building the menu.'}
              action={!search ? <Button variant="contained" onClick={() => setFormOpen(true)}>Create category</Button> : undefined} /> :
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
              {filtered.map((category) => (
                <Card key={category.id} variant="outlined" sx={{ boxShadow: 'none', opacity: category.isActive ? 1 : .68 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                      <Avatar variant="rounded" src={category.imagePath ?? undefined} sx={{ bgcolor: category.isActive ? 'primary.light' : 'action.hover', color: category.isActive ? 'primary.dark' : 'text.secondary', borderRadius: 2.5, width: 58, height: 58 }}><RestaurantRoundedIcon /></Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" noWrap>{category.name}</Typography>
                        <Stack direction="row" alignItems="center" spacing={.75} mt={.5}><DragIndicatorRoundedIcon fontSize="small" color="disabled" /><Typography variant="caption" color="text.secondary">Order {category.displayOrder}</Typography></Stack>
                      </Box>
                      <Tooltip title="Edit category"><IconButton size="small" onClick={() => { setEditing(category); setFormOpen(true); }}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ my: 2, minHeight: 40 }}>{category.description || 'No description provided.'}</Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Chip size="small" label={`${category.itemCount} item${category.itemCount === 1 ? '' : 's'}`} />
                      <Stack direction="row" alignItems="center"><Typography variant="caption" color="text.secondary">{category.isActive ? 'Active' : 'Inactive'}</Typography><Switch size="small" checked={category.isActive} onChange={() => setStatusTarget(category)} inputProps={{ 'aria-label': `Toggle ${category.name}` }} /></Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>}
        </CardContent>
      </Card>
      <CategoryFormDialog open={formOpen} category={editing} saving={saving} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={submit} />
      <Dialog open={Boolean(statusTarget)} onClose={() => !saving && setStatusTarget(null)}>
        <DialogTitle>{statusTarget?.isActive ? 'Deactivate category?' : 'Activate category?'}</DialogTitle>
        <DialogContent><Typography color="text.secondary">{statusTarget?.isActive ? 'Its items will no longer be orderable until the category is active again.' : 'This category will become visible for menu use again.'}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setStatusTarget(null)} disabled={saving}>Cancel</Button><Button variant="contained" color={statusTarget?.isActive ? 'warning' : 'primary'} loading={saving} onClick={() => void changeStatus()}>Confirm</Button></DialogActions>
      </Dialog>
      <FeedbackSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}
