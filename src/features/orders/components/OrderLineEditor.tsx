import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material';
import type { OrderItem } from '../types/orderTypes';
import { formatAmount } from '../types/orderTypes';

// A line sent to the kitchen is fixed: it shows its ticket and can only be voided (onVoid is given when allowed).
export function OrderLineEditor({ item, editable, disabled, ticketLabel, onSave, onRemove, onVoid, onDirty }: {
  item: OrderItem; editable: boolean; disabled: boolean; ticketLabel?: string;
  onSave: (quantity: number, notes: string, saved: () => void) => void; onRemove: () => void; onVoid?: () => void; onDirty: (id: string, dirty: boolean) => void;
}) {
  const sent = Boolean(item.kitchenTicketId);
  const voided = Boolean(item.voidedAtUtc);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes ?? '');
  const [dirty, setDirty] = useState(false);
  useEffect(() => { onDirty(item.id, dirty); return () => onDirty(item.id, false); }, [item.id, dirty, onDirty]);
  useEffect(() => { if (!dirty) { setQuantity(String(item.quantity)); setNotes(item.notes ?? ''); } }, [item, dirty]);
  const valid = Number.isInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= 2147483647 && notes.length <= 1000;
  return <Card variant="outlined"><CardContent><Stack spacing={1.5}>
    <Typography fontWeight={700}>{item.name}</Typography>
    <Typography>{formatAmount(item.unitPrice)} each · {item.kitchenName}</Typography>
    <Typography>Line total: {formatAmount(item.lineTotal)}</Typography>
    {sent && <Chip size="small" sx={{ alignSelf: 'flex-start' }} color={voided ? 'default' : 'info'} label={voided ? 'Voided' : `Sent · ${ticketLabel ?? item.kitchenName}`} />}
    {editable && !sent ? <>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button aria-label={`Decrease ${item.name}`} disabled={disabled || Number(quantity) <= 1} onClick={() => { setQuantity(String(Number(quantity) - 1)); setDirty(true); }}>−</Button>
        <TextField label={`Quantity for ${item.name}`} type="number" size="small" value={quantity} disabled={disabled}
          onChange={e => { setQuantity(e.target.value); setDirty(true); }} slotProps={{ htmlInput: { min: 1, step: 1, max: 2147483647 } }} />
        <Button aria-label={`Increase ${item.name}`} disabled={disabled} onClick={() => { setQuantity(String(Number(quantity) + 1)); setDirty(true); }}>+</Button>
      </Stack>
      <TextField label={`Notes for ${item.name}`} value={notes} multiline disabled={disabled} onChange={e => { setNotes(e.target.value); setDirty(true); }} slotProps={{ htmlInput: { maxLength: 1000 } }} />
      <Stack direction="row" spacing={1}>
        <Button disabled={disabled || !dirty || !valid} onClick={() => onSave(Number(quantity), notes, () => setDirty(false))}>Save item</Button>
        <Button color="error" disabled={disabled} onClick={onRemove}>Remove item</Button>
      </Stack>
    </> : <>
      <Typography sx={{ textDecoration: voided ? 'line-through' : undefined }}>{item.quantity} items{item.notes ? ` · ${item.notes}` : ''}</Typography>
      {voided && <Typography color="text.secondary">Voided: {item.voidReason}</Typography>}
      {onVoid && sent && !voided && <Button color="error" sx={{ alignSelf: 'flex-start' }} disabled={disabled} onClick={onVoid}>Void item</Button>}
    </>}
  </Stack></CardContent></Card>;
}
