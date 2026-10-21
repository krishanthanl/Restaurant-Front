import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import type { OrderItem } from '../types/orderTypes';
import { formatAmount } from '../types/orderTypes';

export function OrderLineEditor({ item, editable, disabled, onSave, onRemove, onDirty }: {
  item: OrderItem; editable: boolean; disabled: boolean;
  onSave: (quantity: number, notes: string, saved: () => void) => void; onRemove: () => void; onDirty: (id: string, dirty: boolean) => void;
}) {
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
    {editable ? <>
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
    </> : <Typography>{item.quantity} items{item.notes ? ` · ${item.notes}` : ''}</Typography>}
  </Stack></CardContent></Card>;
}
