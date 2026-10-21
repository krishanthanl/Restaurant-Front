import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, Card, CardContent, FormControl, IconButton, InputAdornment, InputLabel,
  MenuItem as SelectOption, Pagination, Select, Stack, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import SoupKitchenOutlinedIcon from '@mui/icons-material/SoupKitchenOutlined';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { FeedbackSnackbar, type Feedback } from '../../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../../services/apiClient';
import { menuApi } from '../api/menuApi';
import { MenuStatusChip } from '../components/MenuStatusChip';
import { MenuItemKitchenDialog } from '../components/MenuItemKitchenDialog';
import { kitchenApi } from '../../kitchens/api/kitchenApi';
import type { Kitchen } from '../../kitchens/types/kitchenTypes';
import { useAuth } from '../../authentication/useAuth';
import { Permissions } from '../../authentication/permissions';
import type { MenuCategory, MenuItem } from '../types/menuTypes';

const pageSize = 10;
// Kitchen filter value for items whose kitchen is inactive, i.e. with no valid assignment.
const needsKitchen = 'needs-kitchen';

export function MenuItemsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permissions.menuManage);
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [kitchenId, setKitchenId] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [needsKitchenCount, setNeedsKitchenCount] = useState(0);
  const [assigning, setAssigning] = useState<MenuItem | null>(null);
  const [savingKitchen, setSavingKitchen] = useState(false);
  // `savingKitchen` disables the dialog only after a re-render; the ref also blocks a second click that lands before it.
  const kitchenSaveInFlight = useRef(false);

  useEffect(() => {
    const success = (location.state as { success?: string } | null)?.success;
    if (success) {
      setFeedback({ severity: 'success', message: success });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    menuApi.getCategories(true).then(setCategories).catch((categoryError) => setFeedback({ severity: 'error', message: getApiErrorMessage(categoryError) }));
    kitchenApi.getKitchens('all').then(setKitchens).catch((kitchenError) => setFeedback({ severity: 'error', message: getApiErrorMessage(kitchenError) }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const activeFilter = status === 'active' ? true : status === 'inactive' ? false : undefined;
      const availableFilter = status === 'available' ? true : status === 'unavailable' ? false : undefined;
      const kitchenFilter = kitchenId === needsKitchen ? { isKitchenActive: false } : { kitchenId };
      const result = await menuApi.getItems({ page, pageSize, search: debouncedSearch, categoryId, ...kitchenFilter, isActive: activeFilter, isAvailable: availableFilter });
      setItems(result.items); setTotal(result.totalCount);
    } catch (loadError) { setError(getApiErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, categoryId, kitchenId, status]);

  useEffect(() => { void load(); }, [load]);

  // Only the count is needed, so ask for a single row.
  const loadNeedsKitchenCount = useCallback(async () => {
    try { setNeedsKitchenCount((await menuApi.getItems({ page: 1, pageSize: 1, isKitchenActive: false })).totalCount); }
    catch { setNeedsKitchenCount(0); }
  }, []);

  useEffect(() => { void loadNeedsKitchenCount(); }, [loadNeedsKitchenCount]);

  const assignKitchen = async (newKitchenId: string) => {
    if (!assigning || kitchenSaveInFlight.current) return;
    kitchenSaveInFlight.current = true;
    setSavingKitchen(true);
    try {
      const result = await menuApi.assignItemKitchen(assigning, newKitchenId);
      setFeedback({ severity: 'success', message: `${assigning.name} is now prepared in ${result.kitchenName}.` });
      setAssigning(null);
      await Promise.all([load(), loadNeedsKitchenCount()]);
    } catch (assignError) {
      // Keep the dialog open and refresh the item so a retry uses its current row version.
      setFeedback({ severity: 'error', message: getApiErrorMessage(assignError) });
      try { setAssigning(await menuApi.getItem(assigning.id)); } catch { /* the list reload below shows any load error */ }
      void load();
    } finally { kitchenSaveInFlight.current = false; setSavingKitchen(false); }
  };

  const updateStatus = async (item: MenuItem, field: 'active' | 'available') => {
    setUpdatingId(item.id);
    try {
      if (field === 'active') await menuApi.setItemStatus(item, !item.isActive);
      else await menuApi.setItemAvailability(item, !item.isAvailable);
      setFeedback({ severity: 'success', message: field === 'active' ? `Item ${item.isActive ? 'deactivated' : 'activated'}.` : `Item marked ${item.isAvailable ? 'unavailable' : 'available'}.` });
      await Promise.all([load(), loadNeedsKitchenCount()]);
    } catch (updateError) { setFeedback({ severity: 'error', message: getApiErrorMessage(updateError) }); }
    finally { setUpdatingId(null); }
  };

  const noFilters = !search && !categoryId && !kitchenId && status === 'all';

  return (
    <>
      <PageHeader eyebrow="Menu catalog" title="Menu items" description="Manage dishes, pricing, visibility, and daily availability."
        action={canManage ? <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/menu/items/new')}>New menu item</Button> : undefined} />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={3}>
            <TextField placeholder="Search menu items" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ flex: 1, minWidth: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} />
            <FormControl sx={{ minWidth: 190 }}><InputLabel>Category</InputLabel><Select label="Category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><SelectOption value="">All categories</SelectOption>{categories.map((category) => <SelectOption key={category.id} value={category.id}>{category.name}</SelectOption>)}</Select></FormControl>
            <FormControl sx={{ minWidth: 175 }}><InputLabel id="menu-items-kitchen-filter">Kitchen</InputLabel><Select labelId="menu-items-kitchen-filter" label="Kitchen" value={kitchenId} onChange={(event) => { setKitchenId(event.target.value); setPage(1); }}><SelectOption value="">All kitchens</SelectOption><SelectOption value={needsKitchen}>Needs kitchen</SelectOption>{kitchens.map((kitchen) => <SelectOption key={kitchen.id} value={kitchen.id}>{kitchen.name}{!kitchen.isActive ? ' (inactive)' : ''}</SelectOption>)}</Select></FormControl>
            <FormControl sx={{ minWidth: 175 }}><InputLabel>Status</InputLabel><Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><SelectOption value="all">All statuses</SelectOption><SelectOption value="active">Active</SelectOption><SelectOption value="inactive">Inactive</SelectOption><SelectOption value="available">Available</SelectOption><SelectOption value="unavailable">Unavailable</SelectOption></Select></FormControl>
          </Stack>
          {needsKitchenCount > 0 && kitchenId !== needsKitchen && <Alert severity="warning" sx={{ mb: 3 }}
            action={<Button color="inherit" onClick={() => { setKitchenId(needsKitchen); setPage(1); }}>Show items</Button>}>
            {needsKitchenCount === 1 ? '1 menu item has' : `${needsKitchenCount} menu items have`} no active kitchen and cannot be ordered. Assign an active kitchen.
          </Alert>}
          {loading ? <LoadingState label="Loading menu items…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : items.length === 0 ?
            <EmptyState title={noFilters ? 'No menu items yet' : 'No matching menu items'} description={noFilters ? 'Add your first dish to begin building the menu.' : 'Adjust the search or filters and try again.'}
              action={noFilters && canManage ? <Button variant="contained" onClick={() => navigate('/menu/items/new')}>Add menu item</Button> : undefined} /> :
            <>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table aria-label="Menu items">
                  <TableHead><TableRow><TableCell>Item</TableCell><TableCell>Category</TableCell><TableCell>Kitchen</TableCell><TableCell align="right">Price</TableCell><TableCell>Status</TableCell><TableCell align="center">Active</TableCell><TableCell align="center">Available</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                  <TableBody>{items.map((item) => (
                    <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Avatar variant="rounded" src={item.imagePath ?? undefined} sx={{ width: 52, height: 52, bgcolor: 'primary.light', color: 'primary.dark' }}><RestaurantMenuRoundedIcon /></Avatar><Box><Typography fontWeight={700}>{item.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 260 }} noWrap>{item.description || 'No description'}</Typography></Box></Stack></TableCell>
                      <TableCell>{item.categoryName}</TableCell>
                      <TableCell><Stack direction="row" spacing={.5} alignItems="center">
                        <Box><Typography variant="body2">{item.kitchenName}</Typography>
                          {!item.isKitchenActive && <Chip size="small" color="error" variant="outlined" label="Kitchen inactive" sx={{ mt: .5 }} />}</Box>
                        {canManage && <Tooltip title="Change kitchen"><IconButton size="small" aria-label={`Change kitchen for ${item.name}`} disabled={savingKitchen} onClick={() => setAssigning(item)}><SoupKitchenOutlinedIcon fontSize="small" /></IconButton></Tooltip>}
                      </Stack></TableCell>
                      <TableCell align="right"><Typography fontWeight={750}>Rs. {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                      <TableCell><MenuStatusChip isActive={item.isActive} isAvailable={item.isAvailable} isOrderable={item.isOrderable} isKitchenActive={item.isKitchenActive} /></TableCell>
                      <TableCell align="center">{canManage ? <Switch size="small" checked={item.isActive} disabled={updatingId === item.id} onChange={() => void updateStatus(item, 'active')} inputProps={{ 'aria-label': `Toggle active status for ${item.name}` }} /> : '—'}</TableCell>
                      <TableCell align="center">{canManage ? <Switch size="small" checked={item.isAvailable} disabled={updatingId === item.id} onChange={() => void updateStatus(item, 'available')} inputProps={{ 'aria-label': `Toggle availability for ${item.name}` }} /> : '—'}</TableCell>
                      <TableCell align="right">{canManage && <Tooltip title="Edit item"><IconButton onClick={() => navigate(`/menu/items/${item.id}/edit`)}><EditOutlinedIcon /></IconButton></Tooltip>}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </TableContainer>
              {total > pageSize && <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}><Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, value) => setPage(value)} color="primary" /></Box>}
            </>}
        </CardContent>
      </Card>
      <MenuItemKitchenDialog item={assigning} kitchens={kitchens} saving={savingKitchen} onClose={() => setAssigning(null)} onSubmit={assignKitchen} />
      <FeedbackSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}
