import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
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
import { kitchenTicketApi } from '../../kitchen/api/kitchenTicketApi';
import { KitchenTicketStatus, kitchenTicketStatusLabels } from '../../kitchen/types/kitchenTicketTypes';
import { OrderLineEditor } from '../components/OrderLineEditor';

const OrderRefreshMs = 20_000;

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
  const [action, setAction] = useState<'ready' | 'close' | 'cancel' | 'void' | null>(null);
  const [voidItemId, setVoidItemId] = useState<string | null>(null);
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
  const mutation = useOrderMutation(reload, setOrder);
  // Kitchen progress changes on other screens; keep ticket states current without disturbing drafts.
  const busy = mutation.saving || mutation.blocked;
  useEffect(() => {
    if (busy) return;
    const timer = window.setInterval(() => { orderApi.get(id).then(setOrder).catch(() => { /* next tick retries */ }); }, OrderRefreshMs);
    return () => window.clearInterval(timer);
  }, [id, busy]);
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
  const liveItems = order?.items.filter(item => !item.voidedAtUtc) ?? [];
  const unsent = liveItems.filter(item => !item.kitchenTicketId).length;
  const unservedTickets = new Set(liveItems.filter(item => item.kitchenTicketId &&
    !order?.tickets?.some(ticket => ticket.id === item.kitchenTicketId && ticket.status === KitchenTicketStatus.Served))
    .map(item => item.kitchenTicketId)).size;
  const serviceIncomplete = unsent > 0 || unservedTickets > 0;
  const canVoid = hasPermission(Permissions.ordersVoidAfterKitchen) && order?.status === 0;
  const ticketLabel = (ticketId?: string | null) => {
    const ticket = order?.tickets?.find(t => t.id === ticketId);
    return ticket ? `${ticket.kitchenName} · ${kitchenTicketStatusLabels[ticket.status]}` : undefined;
  };
  if (error || !order) return <ErrorState message={error ?? 'Order was not found.'} onRetry={() => setRevision(x => x + 1)} />;
  return <>
    <PageHeader eyebrow="Dine-in service" title={`Order #${order.orderNumber}`} description={`Tables ${order.tables.map(t => t.tableNumber).join(' + ')} · ${order.guestCount} guests · ${order.waiterName ?? 'Unassigned waiter'}`}
      action={<Button component={Link} to="/orders/active" disabled={mutation.blocked}>Active orders</Button>} />
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}><Chip label={orderStatusLabels[order.status]} /><Typography role="status">{mutation.saving ? 'Saving…' : mutation.error ? 'Action needs attention' : 'All confirmed changes saved'}</Typography></Stack>
    {order.status === 1 && <Alert severity={order.billingStatus === 2 ? 'success' : 'info'} sx={{ mb: 2 }}>
      {order.billingStatus === 2 ? 'Bill paid. Close the visit after guests leave; the table stays occupied until then.' : order.billingStatus === 1 ? 'Bill partially paid. The cashier must record the remaining payment before closure.' : 'Bill requested. Pending cashier billing and payment.'}
      {order.billRequestedAtUtc && ` Requested ${new Date(order.billRequestedAtUtc).toLocaleString()}.`}
    </Alert>}
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
              {menu.items.map(item => <Card key={item.id}>
                <Avatar variant="square" src={item.imagePath || undefined} alt={item.name}
                  sx={{ width: '100%', height: 160, bgcolor: 'primary.light', color: 'primary.main' }}
                  slotProps={{ img: { loading: 'lazy' } }}>
                  <RestaurantMenuRoundedIcon sx={{ fontSize: 48 }} />
                </Avatar>
                <CardContent><Stack spacing={1}>
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
          ticketLabel={ticketLabel(item.kitchenTicketId)} onVoid={canVoid ? () => { setReason(''); setVoidItemId(item.id); setAction('void'); } : undefined}
          onSave={(quantity, itemNotes, saved) => run(op => orderApi.updateItem(order.id, item.id, quantity, itemNotes || null, order.rowVersion, op), saved)}
          onRemove={() => run(op => orderApi.remove(order.id, item.id, order.rowVersion, op))} />)}
        {editable ? <>
          <TextField label="Order notes" value={notes} multiline disabled={mutation.blocked} onChange={e => { setNotes(e.target.value); setNotesDirty(true); }} slotProps={{ htmlInput: { maxLength: 1000 } }} />
          <Button disabled={mutation.blocked || !notesDirty} onClick={() => run(op => orderApi.notes(order.id, notes || null, order.rowVersion, op), () => setNotesDirty(false))}>Save notes</Button>
        </> : <Typography>Notes: {order.notes ?? 'None'}</Typography>}
        {!!order.tickets?.length && <Stack component="section" aria-label="Kitchen tickets" spacing={1}>
          <Typography variant="h6">Kitchen tickets</Typography>
          {order.tickets.map(ticket => <Stack key={ticket.id} direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography>Ticket {ticket.ticketNumber} · {ticket.kitchenName}</Typography>
            <Chip size="small" label={kitchenTicketStatusLabels[ticket.status]} color={ticket.status === KitchenTicketStatus.Prepared ? 'success' : 'default'} />
            {ticket.status === KitchenTicketStatus.Prepared && order.status < 2 && hasPermission(Permissions.ordersCreate) &&
              <Button size="small" disabled={mutation.blocked} onClick={() => run(async () => { await kitchenTicketApi.advance(ticket, 'served'); return orderApi.get(order.id); })}>Mark served</Button>}
          </Stack>)}
        </Stack>}
        <Typography variant="h5">Subtotal: {formatAmount(order.subtotal)}</Typography>
        <Typography variant="body2">Subtotal excludes tax, service charges and payments.</Typography>
        {order.status < 2 && <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {order.status === 0 && unsent > 0 && hasPermission(Permissions.ordersCreate) && <Button variant="contained" disabled={mutation.blocked || notesDirty || dirtyLines.size > 0} onClick={() => run(op => orderApi.sendToKitchen(order.id, order.rowVersion, op))}>Send to kitchen ({unsent})</Button>}
          {order.status === 0 && hasPermission(Permissions.ordersSubmit) && <Button variant="contained" disabled={mutation.blocked || !liveItems.length || serviceIncomplete || notesDirty || dirtyLines.size > 0} onClick={() => setAction('ready')}>Request bill</Button>}
          {order.status === 1 && hasPermission(Permissions.ordersSubmit) && <Button disabled={mutation.blocked || order.hasActivePayments} onClick={() => run(op => orderApi.reopen(order.id, order.rowVersion, op))}>Reopen to add items</Button>}
          {order.status === 1 && hasPermission(Permissions.billingManage) && <Button component={Link} to={`/billing/orders/${order.id}`} disabled={mutation.blocked}>Open billing</Button>}
          {order.status === 1 && (hasPermission(Permissions.billingManage) || hasPermission(Permissions.ordersSubmit)) && <Button variant="contained" disabled={mutation.blocked || serviceIncomplete || order.billingStatus !== 2} onClick={() => setAction('close')}>Close visit</Button>}
          {hasPermission(Permissions.ordersVoid) && (order.status === 0 || hasPermission(Permissions.ordersVoidAfterKitchen)) && <Button color="error" disabled={mutation.blocked} onClick={() => { setReason(''); setAction('cancel'); }}>Cancel order and visit</Button>}
        </Stack>}
        {(notesDirty || dirtyLines.size > 0) && <Typography role="status">Save your item and order notes before sending or marking ready to bill.</Typography>}
        {order.status === 0 && unsent > 0 && <Typography role="status">Send new items to the kitchen before requesting the bill.</Typography>}
        {order.status === 1 && unsent > 0 && <Typography role="status">Reopen this order and send the remaining items to the kitchen before closing.</Typography>}
        {order.status < 2 && unservedTickets > 0 && <Typography role="status">{unservedTickets} kitchen {unservedTickets === 1 ? 'ticket still needs' : 'tickets still need'} to be marked served before billing or closing.</Typography>}
        {order.closedAtUtc && <Typography>Closed {new Date(order.closedAtUtc).toLocaleString()}. {order.billingStatus === 2 ? 'Bill paid.' : 'Historical closure: no billing record is available.'}</Typography>}
        {order.cancellationReason && <Typography>Cancelled: {order.cancellationReason}</Typography>}
        {order.status >= 2 && <Button component={Link} to="/restaurant/table-dashboard">Return to table dashboard</Button>}
      </Stack>
    </Box>
    <Dialog open={action !== null} onClose={() => { if (!mutation.saving) setAction(null); }} fullWidth maxWidth="sm">
      <DialogTitle>{action === 'ready' ? 'Customer requested the bill?' : action === 'close' ? 'Guests have left — close visit?' : action === 'void' ? 'Void item?' : 'Cancel order and dining session?'}</DialogTitle>
      <DialogContent><Stack spacing={2}>
        <Typography>{action === 'ready' ? 'The order will appear in Pending billing for the cashier. Item and note editing will be locked.' : action === 'void' ? 'The kitchen will see the item struck out and it leaves the bill.' : action === 'close' ? 'Payment is complete. Confirm the guests have left. Tables will be marked Cleaning.' : 'The visit will end and its tables will be marked Cleaning. Orders with active payments cannot be cancelled.'}</Typography>
        {(action === 'cancel' || action === 'void') && <TextField label={action === 'void' ? 'Void reason' : 'Cancellation reason'} value={reason} onChange={e => setReason(e.target.value)} multiline disabled={mutation.saving} slotProps={{ htmlInput: { maxLength: 500 } }} />}
      </Stack></DialogContent>
      <DialogActions><Button disabled={mutation.saving} onClick={() => setAction(null)}>Back</Button>
        <Button variant="contained" disabled={mutation.blocked || ((action === 'ready' || action === 'close') && serviceIncomplete) || (action === 'close' && order.billingStatus !== 2) || (action === 'cancel' || action === 'void') && !reason.trim()} onClick={() => {
          if (!action) return;
          const selected = action; setAction(null);
          if (selected === 'void') { if (voidItemId) run(op => orderApi.voidItem(order.id, voidItemId, reason, order.rowVersion, op)); return; }
          run(op => selected === 'ready' ? orderApi.ready(order.id, order.rowVersion, op) : orderApi.end(order.id, selected, order.rowVersion, order.sessionRowVersion, op, selected === 'cancel' ? reason : undefined));
        }}>Confirm</Button></DialogActions>
    </Dialog>
  </>;
}
