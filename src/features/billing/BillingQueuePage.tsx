import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, MenuItem, Pagination, Stack, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ContentState';
import { getApiErrorMessage } from '../../services/apiClient';
import { areaApi } from '../areas/api/areaApi';
import type { Area } from '../areas/types/areaTypes';
import { formatAmount } from '../orders/types/orderTypes';
import { billingApi } from './billingApi';
import { billStatusLabels, type BillingQueuePage as Queue } from './billingTypes';

export function BillingQueuePage() {
  const [params, setParams] = useSearchParams();
  const paid = params.get('view') === 'paid';
  const [page, setPage] = useState(1);
  const [areaId, setAreaId] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [data, setData] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const controller = new AbortController();
    areaApi.getAreas('all', controller.signal).then(setAreas).catch(e => { if (!controller.signal.aborted) setAreaError(getApiErrorMessage(e)); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    billingApi.queue({ paid, page, pageSize: 20, areaId: areaId || undefined }, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setData(value); setError(null); setNow(Date.now());
      if (page > 1 && !value.items.length) setPage(Math.max(1, Math.ceil(value.totalCount / value.pageSize)));
    }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [paid, page, areaId, revision]);
  useEffect(() => {
    const timer = window.setInterval(() => setRevision(value => value + 1), 10_000);
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return <>
    <PageHeader eyebrow="Cashier" title="Billing" description="Requested bills, split payments, and paid visits awaiting departure."
      action={<Button onClick={() => setRevision(x => x + 1)} disabled={loading}>Refresh billing</Button>} />
    <Tabs value={paid ? 'paid' : 'pending'} onChange={(_, value: string) => { setParams(value === 'paid' ? { view: 'paid' } : {}); setPage(1); setLoading(true); setData(null); }} sx={{ mb: 2 }}>
      <Tab value="pending" label="Pending billing" /><Tab value="paid" label="Paid bills" />
    </Tabs>
    <TextField select label="Area" value={areaId} onChange={e => { setAreaId(e.target.value); setPage(1); setLoading(true); }} sx={{ minWidth: 200, mb: 2 }}>
      <MenuItem value="">All areas</MenuItem>{areas.map(area => <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>)}
    </TextField>
    {areaError && <Alert severity="warning">Area filters could not load: {areaError}</Alert>}
    {error && data && <Alert severity="warning" sx={{ mb: 2 }}>Refresh failed: {error}. Displayed orders may be out of date.</Alert>}
    {loading ? <LoadingState label="Loading billing queue…" /> : error && !data ? <ErrorState message={error} onRetry={() => setRevision(x => x + 1)} /> : !data?.items.length ?
      <EmptyState title={paid ? 'No paid bills' : 'No orders pending billing'} description={paid ? 'Paid bills will appear here.' : 'Orders appear here when a waiter requests the bill.'} /> : <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>
          {data.items.map(order => <Card key={order.orderId}><CardContent><Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between"><Typography variant="h6">Order #{order.orderNumber}</Typography><Chip size="small" label={order.billingStatus == null ? 'Bill not generated' : billStatusLabels[order.billingStatus]} /></Stack>
            <Typography>Tables {order.tables.map(table => table.tableNumber).join(' + ')}</Typography>
            <Typography>{order.waiterName ?? 'Unassigned waiter'}</Typography>
            <Typography variant="body2" color="text.secondary">{order.requestedAtUtc ? `Requested ${new Date(order.requestedAtUtc).toLocaleString()}${paid ? '' : ` · waiting ${Math.max(0, Math.floor((now - new Date(order.requestedAtUtc).getTime()) / 60000))} min`}` : 'Earlier request'}</Typography>
            <Stack direction="row" spacing={1}>
              {order.menuPreview.slice(0, 5).map(item => <Tooltip key={item.menuItemId} title={item.name}><Avatar variant="rounded" src={item.imagePath || undefined} alt={item.name} sx={{ width: 44, height: 44, bgcolor: 'primary.light', color: 'primary.main' }} slotProps={{ img: { loading: 'lazy' } }}><RestaurantMenuRoundedIcon /></Avatar></Tooltip>)}
              {order.menuPreview.length > 5 && <Avatar variant="rounded" sx={{ width: 44, height: 44 }}>+{order.menuPreview.length - 5}</Avatar>}
            </Stack>
            <Typography>Subtotal: {order.currency ?? 'Rs.'} {formatAmount(order.subtotal)}</Typography>
            {order.grandTotal != null && <Typography fontWeight={700}>Total: {order.currency} {formatAmount(order.grandTotal)} · Balance: {formatAmount(order.balance ?? 0)}</Typography>}
            {paid && <Typography color="success.main">{order.visitClosed ? 'Visit closed' : 'Paid · table remains occupied until guests leave'}</Typography>}
            <Button component={Link} to={`/billing/orders/${order.orderId}`} variant="contained">{paid ? 'View receipt' : 'Open billing'}</Button>
          </Stack></CardContent></Card>)}
        </Box>
        <Pagination sx={{ mt: 2 }} page={page} count={Math.ceil(data.totalCount / data.pageSize)} onChange={(_, value) => { setPage(value); setLoading(true); }} />
      </>}
  </>;
}
