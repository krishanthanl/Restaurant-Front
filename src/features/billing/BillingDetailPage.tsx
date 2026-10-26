import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState, LoadingState } from '../../components/ContentState';
import { getApiErrorMessage } from '../../services/apiClient';
import { useAuth } from '../authentication/useAuth';
import { Permissions } from '../authentication/permissions';
import { orderApi } from '../orders/api/orderApi';
import { checkName, formatAmount, type Order } from '../orders/types/orderTypes';
import { billingApi } from './billingApi';
import { paymentMethods, type Bill } from './billingTypes';
import { BillReceipt } from './BillReceipt';
import { useBillingMutation } from './useBillingMutation';

export function BillingDetailPage() {
  const { id = '' } = useParams(); const { hasPermission } = useAuth();
  const [order, setOrder] = useState<Order | null>(null); const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState(0); const [amount, setAmount] = useState(''); const [tendered, setTendered] = useState('');
  const [voidId, setVoidId] = useState<string | null>(null); const [reason, setReason] = useState('');
  const reload = useCallback(async (signal?: AbortSignal) => {
    const [value, current] = await Promise.all([orderApi.get(id, signal), billingApi.forOrder(id, signal).catch(e => {
      if (axios.isAxiosError(e) && e.response?.status === 404) return null;
      throw e;
    })]);
    if (!signal?.aborted) { setOrder(value); setBill(current); setError(null); }
  }, [id]);
  useEffect(() => { const controller = new AbortController(); setLoading(true); reload(controller.signal).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [reload]);
  const mutation = useBillingMutation<Bill>(reload, setBill);
  const amountValid = /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) > 0 && Number(amount) <= (bill?.balance ?? 0);
  const tenderedValid = method !== 0 || (/^\d+(\.\d{1,2})?$/.test(tendered) && Number(tendered) >= Number(amount));
  const pay = () => {
    if (!bill || !amountValid || !tenderedValid) return;
    const request = { method, amount: Number(amount), tenderedAmount: method === 0 ? Number(tendered) : null, rowVersion: bill.rowVersion, operationId: crypto.randomUUID() };
    void mutation.run(() => billingApi.pay(bill.id, request), () => { setAmount(''); setTendered(''); });
  };
  if (loading) return <LoadingState label="Loading billing details…" />;
  if (error || !order) return <ErrorState message={error ?? 'Order was not found.'} onRetry={() => void mutation.refresh()} />;
  return <>
    <PageHeader eyebrow="Cashier" title={`Billing · ${checkName(order)}`} description="Record externally confirmed payments. The table stays occupied until the visit is closed."
      action={<Button component={Link} to="/billing">Billing queue</Button>} />
    {mutation.error && <Alert severity="error" sx={{ mb: 2 }}>{mutation.error}</Alert>}
    {mutation.refreshRequired && <Alert severity="warning">Refresh billing before continuing.</Alert>}
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <Button disabled={mutation.saving} onClick={() => void mutation.refresh()}>Refresh billing</Button>
      {mutation.retryPending && <Button disabled={mutation.saving} onClick={() => void mutation.retry()}>Retry pending action</Button>}
      <Button component={Link} to={`/orders/${order.id}`} disabled={mutation.blocked}>View order / close check</Button>
      {bill && <Button disabled={mutation.blocked} onClick={() => window.print()}>{bill.status === 2 ? 'Print receipt' : 'Print bill'}</Button>}
    </Stack>
    {!bill ? <Stack spacing={2}>
      <Typography>Tables {order.tables.map(t => t.tableNumber).join(' + ')}</Typography>
      {order.items.filter(x => !x.voidedAtUtc).map(item => <Typography key={item.id}>{item.quantity} × {item.name} · {formatAmount(item.lineTotal)}</Typography>)}
      <Typography fontWeight={700}>Subtotal: {formatAmount(order.subtotal)}</Typography>
      <Typography>Generating the bill freezes item prices and the current tax and service-charge rates.</Typography>
      <Button variant="contained" disabled={mutation.blocked || order.status !== 1} onClick={() => {
        const request = { rowVersion: order.rowVersion, operationId: crypto.randomUUID() };
        void mutation.run(() => billingApi.generate(order.id, request));
      }}>Generate bill</Button>
    </Stack> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' }, gap: 3 }}>
      <BillReceipt bill={bill} />
      <Stack spacing={2}>
        {bill.status === 2 && <Alert severity="success">Paid. {bill.visitClosed ? 'This check is closed.' : 'Close the check from the order once the guests are done; the last check closed ends the visit.'}</Alert>}
        {!bill.visitClosed && bill.status < 2 && hasPermission(Permissions.paymentsRecord) && <Box component="form" onSubmit={e => { e.preventDefault(); pay(); }}>
          <Stack spacing={2}>
            <Typography variant="h6">Record payment</Typography>
            <Typography>Balance: {bill.currency} {formatAmount(bill.balance)}</Typography>
            <TextField select label="Payment method" value={method} disabled={mutation.blocked} onChange={e => setMethod(Number(e.target.value))}>{paymentMethods.map((label, index) => <MenuItem key={label} value={index}>{label}</MenuItem>)}</TextField>
            <TextField label="Payment amount" value={amount} disabled={mutation.blocked} onChange={e => setAmount(e.target.value)} helperText="Amount applied to this bill, up to the balance." slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
            {method === 0 && <TextField label="Cash tendered" value={tendered} disabled={mutation.blocked} onChange={e => setTendered(e.target.value)} helperText="The server calculates change." slotProps={{ htmlInput: { inputMode: 'decimal' } }} />}
            {method !== 0 && <Alert severity="info">Confirm payment in the external terminal or QR app before recording it here.</Alert>}
            <Button type="submit" variant="contained" disabled={mutation.blocked || !amountValid || !tenderedValid}>Record payment</Button>
          </Stack>
        </Box>}
        {hasPermission(Permissions.paymentsRefund) && !bill.visitClosed && bill.payments.filter(p => !p.voidedAtUtc).map(payment => <Button key={payment.id} color="error" disabled={mutation.blocked} onClick={() => { setVoidId(payment.id); setReason(''); }}>Correct {paymentMethods[payment.method]} payment · {formatAmount(payment.amount)}</Button>)}
      </Stack>
    </Box>}
    <Dialog open={voidId !== null} onClose={() => { if (!mutation.blocked) setVoidId(null); }} fullWidth maxWidth="sm">
      <DialogTitle>Void mistaken payment entry?</DialogTitle><DialogContent><Typography sx={{ mb: 2 }}>This corrects the record only. Handle any real refund through the external payment provider.</Typography><TextField fullWidth label="Correction reason" value={reason} disabled={mutation.blocked} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} /></DialogContent>
      <DialogActions><Button disabled={mutation.saving} onClick={() => setVoidId(null)}>Back</Button><Button color="error" disabled={mutation.blocked || !reason.trim()} onClick={() => {
        if (!bill || !voidId) return;
        const paymentId = voidId; const request = { reason: reason.trim(), rowVersion: bill.rowVersion, operationId: crypto.randomUUID() };
        void mutation.run(() => billingApi.voidPayment(bill.id, paymentId, request), () => setVoidId(null));
      }}>Void payment entry</Button></DialogActions>
    </Dialog>
  </>;
}
