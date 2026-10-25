import { Box, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { Bill } from './billingTypes';
import { billStatusLabels, paymentMethods } from './billingTypes';
import { formatAmount } from '../orders/types/orderTypes';

export function BillReceipt({ bill }: { bill: Bill }) {
  const money = (value: number) => `${bill.currency} ${formatAmount(value)}`;
  return <Box className="billing-receipt" sx={{ bgcolor: 'background.paper', p: { xs: 2, md: 3 }, borderRadius: 3 }}>
    <Typography variant="h5">{bill.restaurantName}</Typography>
    <Typography variant="h6">{bill.status === 2 ? 'Paid receipt' : bill.status === 3 ? 'Voided bill' : 'Bill'} #{bill.billNumber}</Typography>
    <Typography>Order #{bill.orderNumber} · Tables {bill.tables.map(table => table.tableNumber).join(' + ')}</Typography>
    <Typography variant="body2">Generated {new Date(bill.generatedAtUtc).toLocaleString()} · Cashier: {bill.cashierName}</Typography>
    <Typography fontWeight={700}>{billStatusLabels[bill.status]}</Typography>
    <Box sx={{ overflowX: 'auto', '@media print': { overflow: 'visible' } }}><Table size="small" aria-label="Bill items">
      <TableHead><TableRow><TableCell>Item</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Price</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
      <TableBody>{bill.items.map(item => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell align="right">{item.quantity}</TableCell><TableCell align="right">{formatAmount(item.unitPrice)}</TableCell><TableCell align="right">{formatAmount(item.lineTotal)}</TableCell></TableRow>)}</TableBody>
    </Table></Box>
    <Stack spacing={0.75} sx={{ my: 2 }}>
      {[['Subtotal', bill.subtotal], [`Service charge (${bill.serviceChargeRate}%)`, bill.serviceCharge], [`Tax (${bill.taxRate}%)`, bill.tax], ['Grand total', bill.grandTotal], ['Paid', bill.paidAmount], ['Balance', bill.balance]].map(([label, amount]) =>
        <Stack key={String(label)} direction="row" justifyContent="space-between"><Typography fontWeight={label === 'Grand total' || label === 'Balance' ? 700 : 400}>{label}</Typography><Typography fontWeight={700}>{money(Number(amount))}</Typography></Stack>)}
    </Stack>
    <Divider />
    <Typography variant="h6" sx={{ mt: 2 }}>Payment history</Typography>
    {!bill.payments.length && <Typography>No payments recorded.</Typography>}
    {bill.payments.map(payment => <Box key={payment.id} sx={{ mt: 1 }}>
      <Typography sx={{ textDecoration: payment.voidedAtUtc ? 'line-through' : undefined }}>{paymentMethods[payment.method]} · {money(payment.amount)}</Typography>
      {payment.tenderedAmount != null && <Typography variant="body2">Tendered {money(payment.tenderedAmount)} · Change {money(payment.change)}</Typography>}
      <Typography variant="body2">{payment.cashierName} · {new Date(payment.recordedAtUtc).toLocaleString()}</Typography>
      {payment.voidedAtUtc && <Typography variant="body2" color="error">Voided by {payment.voidedByName ?? 'Manager'} · {payment.voidReason} · {new Date(payment.voidedAtUtc).toLocaleString()}</Typography>}
    </Box>)}
    {bill.status !== 2 && <Typography sx={{ mt: 2 }}>This bill is not a paid receipt.</Typography>}
  </Box>;
}
