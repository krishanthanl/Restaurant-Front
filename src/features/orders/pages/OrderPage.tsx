import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { getApiErrorMessage } from '../../../services/apiClient';
import { useAuth } from '../../authentication/useAuth';
import { Permissions } from '../../authentication/permissions';
import { menuApi } from '../../menu/api/menuApi';
import type { MenuCategory, MenuItem as MenuItemModel, PagedResponse } from '../../menu/types/menuTypes';
import { orderApi } from '../api/orderApi';
import { formatAmount, orderStatusLabels, type Order } from '../types/orderTypes';
import { useOrderMutation } from '../hooks/useOrderMutation';
import { OrderLineEditor } from '../components/OrderLineEditor';

export function OrderPage() {
  const { id = '' } = useParams();
  const { hasPermission } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menu, setMenu] = useState<PagedResponse<MenuItemModel> | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [menuRevision, setMenuRevision] = useState(0);
  const menuRequest = useRef<AbortController | null>(null);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [dirtyLines, setDirtyLines] = useState<Set<string>>(() => new Set());
  const lineDirty = useCallback((lineId: string, dirty: boolean) => {
    setDirtyLines(previous => {
      if (previous.has(lineId) === dirty) return previous;
      const next = new Set(previous); if (dirty) next.add(lineId); else next.delete(lineId); return next;
    });
  }, []);
  const [action, setAction] = useState<'ready' | 'close' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const editable = hasPermission(Permissions.ordersCreate) && order?.status === 0;
  const loadOrder = useCallback(async () => {
    const value = await orderApi.get(id); setOrder(value);
  }, [id]);
  const reload = useCallback(async () => {
    await loadOrder();
    // A failed write may mean the menu is stale as well as the order.
    menuRequest.current?.abort(); setMenuLoading(true);
    try {
      const [items, groups] = await Promise.all([
        menuApi.getItems({ page, pageSize: 12, search, categoryId, isActive: true }), menuApi.getCategories(false),
      ]);
      setMenu(items); setCategories(groups); setMenuError(null);
    } catch (e) { setMenuError(getApiErrorMessage(e)); throw e; }
    finally { setMenuLoading(false); }
  }, [loadOrder, page, search, categoryId]);
  const mutation = useOrderMutation(reload);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    orderApi.get(id, controller.signal).then(value => { if (!controller.signal.aborted) setOrder(value); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => {
    if (!notesDirty && order) setNotes(order.notes ?? '');
  }, [order, notesDirty]);
  useEffect(() => {
    const controller = new AbortController(); setMenuLoading(true); setMenuError(null);
    menuRequest.current = controller;
    const timer = window.setTimeout(() => {
      Promise.all([menuApi.getCategories(false, undefined, controller.signal), menuApi.getItems({ page, pageSize: 12, search, categoryId, isActive: true }, controller.signal)])
        .then(([groups, items]) => { if (!controller.signal.aborted) { setCategories(groups); setMenu(items); } })
        .catch((e: unknown) => { if (!controller.signal.aborted) setMenuError(getApiErrorMessage(e)); })
        .finally(() => { if (!controller.signal.aborted) setMenuLoading(false); });
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, search, categoryId, menuRevision]);
  const run = (task: (operationId: string) => Promise<Order>, saved?: () => void) => {
    const operationId = crypto.randomUUID();
    void mutation.run(() => task(operationId), saved);
  };
  if (loading) return <LoadingState label="Loading order…" />;
  if (error || !order) return <ErrorState message={error ?? 'Order was not found.'} onRetry={() => setRevision(x => x + 1)} />;
  return <>
    <PageHeader eyebrow="Dine-in service" title={`Order #${order.orderNumber}`} description={`Tables ${order.tables.map(t => t.tableNumber).join(' + ')} · ${order.guestCount} guests · ${order.waiterName ?? 'Unassigned waiter'}`}
      action={<Button component={Link} to="/orders/active" disabled={mutation.blocked}>Active orders</Button>} />
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}><Chip label={orderStatusLabels[order.status]} /><Typography role="status">{mutation.saving ? 'Saving…' : mutation.error ? 'Action needs attention' : 'All confirmed changes saved'}</Typography></Stack>
    {mutation.error && <Alert severity="error" sx={{ mb: 2 }}>{mutation.error}</Alert>}
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      {mutation.retryPending && <Button disabled={mutation.saving} onClick={() => void mutation.retry()}>Retry pending action</Button>}
      <Button disabled={mutation.saving} onClick={() => void mutation.refresh()}>Refresh order and menu</Button>
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: editable ? 'minmax(0, 1fr) minmax(320px, 440px)' : '1fr' }, gap: 3 }}>
      {editable && <Box component="section" aria-label="Menu">
        <Stack spacing={2}>
          <TextField label="Search menu" value={search} disabled={mutation.saving} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <TextField select label="Category" value={categoryId} disabled={mutation.saving} onChange={e => { setCategoryId(e.target.value); setPage(1); }}>
            <MenuItem value="">All categories</MenuItem>{categories.filter(c => c.isActive).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          {menuLoading ? <LoadingState label="Loading menu…" /> : menuError ? <ErrorState message={menuError} onRetry={() => setMenuRevision(x => x + 1)} /> : !menu?.items.length ? <EmptyState title="No menu items" description="Choose another category or search term." /> : <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              {menu.items.map(item => <Card key={item.id}><CardContent><Stack spacing={1}>
                <Typography variant="h6">{item.name}</Typography><Typography>{item.description}</Typography>
                <Typography>{formatAmount(item.price)}</Typography><Typography variant="caption">{item.kitchenName}</Typography>
                {!item.isOrderable && <Typography color="error">Currently unavailable</Typography>}
                <Button variant="contained" disabled={mutation.blocked || !item.isOrderable} onClick={() => run(op => orderApi.add(order.id, item.id, 1, null, order.rowVersion, op))}>Add {item.name}</Button>
              </Stack></CardContent></Card>)}
            </Box>
            {menu.totalCount > menu.pageSize && <Pagination count={Math.ceil(menu.totalCount / menu.pageSize)} page={page} onChange={(_, value) => setPage(value)} disabled={mutation.saving} />}
          </>}
        </Stack>
      </Box>}
      <Stack component="section" aria-label="Order details" spacing={2}>
        {order.items.length === 0 && <Typography>No items yet. Add items from the menu.</Typography>}
        {order.items.map(item => <OrderLineEditor key={item.id} item={item} editable={editable} disabled={mutation.blocked} onDirty={lineDirty}
          onSave={(quantity, itemNotes, saved) => run(op => orderApi.updateItem(order.id, item.id, quantity, itemNotes || null, order.rowVersion, op), saved)}
          onRemove={() => run(op => orderApi.remove(order.id, item.id, order.rowVersion, op))} />)}
        {editable ? <>
          <TextField label="Order notes" value={notes} multiline disabled={mutation.blocked} onChange={e => { setNotes(e.target.value); setNotesDirty(true); }} slotProps={{ htmlInput: { maxLength: 1000 } }} />
          <Button disabled={mutation.blocked || !notesDirty} onClick={() => run(op => orderApi.notes(order.id, notes || null, order.rowVersion, op), () => setNotesDirty(false))}>Save notes</Button>
        </> : <Typography>Notes: {order.notes ?? 'None'}</Typography>}
        <Typography variant="h5">Subtotal: {formatAmount(order.subtotal)}</Typography>
        <Typography variant="body2">Subtotal excludes tax, service charges and payments.</Typography>
        {order.status < 2 && <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {order.status === 0 && hasPermission(Permissions.ordersSubmit) && <Button variant="contained" disabled={mutation.blocked || !order.items.length || notesDirty || dirtyLines.size > 0} onClick={() => setAction('ready')}>Ready to bill</Button>}
          {order.status === 1 && hasPermission(Permissions.billingManage) && <Button variant="contained" disabled={mutation.blocked} onClick={() => setAction('close')}>Close order and visit</Button>}
          {hasPermission(Permissions.ordersVoid) && <Button color="error" disabled={mutation.blocked} onClick={() => { setReason(''); setAction('cancel'); }}>Cancel order and visit</Button>}
        </Stack>}
        {(notesDirty || dirtyLines.size > 0) && <Typography role="status">Save your item and order notes before marking ready to bill.</Typography>}
        {order.closedAtUtc && <Typography>Closed {new Date(order.closedAtUtc).toLocaleString()}. No payment was recorded.</Typography>}
        {order.cancellationReason && <Typography>Cancelled: {order.cancellationReason}</Typography>}
        {order.status >= 2 && <Button component={Link} to="/restaurant/table-dashboard">Return to table dashboard</Button>}
      </Stack>
    </Box>
    <Dialog open={action !== null} onClose={() => { if (!mutation.saving) setAction(null); }} fullWidth maxWidth="sm">
      <DialogTitle>{action === 'ready' ? 'Mark ready to bill?' : action === 'close' ? 'Close order and dining session?' : 'Cancel order and dining session?'}</DialogTitle>
      <DialogContent><Stack spacing={2}>
        <Typography>{action === 'ready' ? 'Item and note editing will be locked.' : 'All tables assigned to this dining session will be released. No payment will be recorded.'}</Typography>
        {action === 'cancel' && <TextField label="Cancellation reason" value={reason} onChange={e => setReason(e.target.value)} multiline disabled={mutation.saving} slotProps={{ htmlInput: { maxLength: 500 } }} />}
      </Stack></DialogContent>
      <DialogActions><Button disabled={mutation.saving} onClick={() => setAction(null)}>Back</Button>
        <Button variant="contained" disabled={mutation.blocked || action === 'cancel' && !reason.trim()} onClick={() => {
          if (!action) return;
          const selected = action; setAction(null);
          run(op => selected === 'ready' ? orderApi.ready(order.id, order.rowVersion, op) : orderApi.end(order.id, selected, order.rowVersion, order.sessionRowVersion, op, selected === 'cancel' ? reason : undefined));
        }}>Confirm</Button></DialogActions>
    </Dialog>
  </>;
}
