import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, MenuItem, Pagination, Stack, TextField, Tooltip, Typography } from '@mui/material';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ContentState';
import { getApiErrorMessage } from '../../../services/apiClient';
import { orderApi } from '../api/orderApi';
import { formatAmount, orderStatusLabels, type OrderPage } from '../types/orderTypes';
import { areaApi } from '../../areas/api/areaApi';
import type { Area } from '../../areas/types/areaTypes';
import { useAuth } from '../../authentication/useAuth';

export function ActiveOrdersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState('');
  const [waiterId, setWaiterId] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [result, setResult] = useState<OrderPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    areaApi.getAreas('all', controller.signal).then(setAreas).catch((e: unknown) => { if (!controller.signal.aborted) setAreaError(getApiErrorMessage(e)); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    orderApi.active({ page, pageSize: 20, areaId: areaId || undefined, waiterId: waiterId || undefined, status: status === '' ? undefined : Number(status) }, controller.signal)
      .then(value => {
        if (controller.signal.aborted) return;
        setResult(value);
        if (page > 1 && !value.items.length) setPage(Math.max(1, Math.ceil(value.totalCount / value.pageSize)));
      })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, areaId, waiterId, status, revision]);
  return <>
    <PageHeader eyebrow="Restaurant service" title="Active orders" description="Open an order to continue service or close the visit."
      action={<Button disabled={loading} onClick={() => setRevision(x => x + 1)}>Refresh orders</Button>} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <TextField select label="Area" value={areaId} onChange={e => { setAreaId(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
        <MenuItem value="">All areas</MenuItem>{areas.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
      </TextField>
      <TextField select label="Order status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
        <MenuItem value="">All active</MenuItem><MenuItem value="0">Open</MenuItem><MenuItem value="1">Ready to bill</MenuItem>
      </TextField>
      <Button onClick={() => { setWaiterId(waiterId ? '' : user?.id ?? ''); setPage(1); }} disabled={!user?.id}>{waiterId ? 'Show all staff' : 'Assigned to me'}</Button>
    </Stack>
    {areaError && <Alert severity="warning">Area filters could not load: {areaError}</Alert>}
    {loading ? <LoadingState label="Loading active orders…" /> : error ? <ErrorState message={error} onRetry={() => setRevision(x => x + 1)} /> : !result?.items.length ?
      <EmptyState title="No active orders" description="Start an order from an active dining session on the table dashboard, or change your filters." /> : <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>
          {result.items.map(order => <Card key={order.id}><CardContent><Stack spacing={1}>
            <Typography variant="h6">Order #{order.orderNumber}</Typography>
            <Typography>Tables: {order.tables.map(t => t.tableNumber).join(' + ')}</Typography>
            <Typography>{order.guestCount} guests · {order.quantityTotal} items · {orderStatusLabels[order.status]}</Typography>
            {!!order.menuPreview?.length && <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" aria-label="Selected menu items">
              {order.menuPreview.slice(0, 5).map(item => <Tooltip key={item.menuItemId} title={item.name}>
                <Avatar variant="rounded" src={item.imagePath || undefined} alt={item.name}
                  sx={{ width: 44, height: 44, bgcolor: 'primary.light', color: 'primary.main' }}
                  slotProps={{ img: { loading: 'lazy' } }}>
                  <RestaurantMenuRoundedIcon />
                </Avatar>
              </Tooltip>)}
              {order.menuPreview.length > 5 && <Tooltip title={order.menuPreview.slice(5).map(item => item.name).join(', ')}>
                <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: 'action.hover', color: 'text.secondary', fontSize: 14 }}>
                  +{order.menuPreview.length - 5}
                </Avatar>
              </Tooltip>}
            </Stack>}
            <Typography>{order.waiterName ?? 'Unassigned waiter'}</Typography>
            <Typography>Opened {new Date(order.openedAtUtc).toLocaleString()}</Typography>
            <Typography fontWeight={700}>Subtotal: {formatAmount(order.subtotal)}</Typography>
            <Button component={Link} to={`/orders/${order.id}`} variant="contained">Open order</Button>
          </Stack></CardContent></Card>)}
        </Box>
        <Pagination sx={{ mt: 2 }} count={Math.ceil(result.totalCount / result.pageSize)} page={page} onChange={(_, value) => setPage(value)} />
      </>}
  </>;
}
