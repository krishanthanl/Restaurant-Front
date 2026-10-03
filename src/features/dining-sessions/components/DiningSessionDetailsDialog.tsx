import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import type { DiningSession, SessionInput, Waiter } from '../types/diningSessionTypes';
import { DiningSessionForm } from './DiningSessionForm';
import { DiningSessionStatusChip } from './DiningSessionStatusChip';
import { validSessionInput } from '../validation/diningSessionValidation';
export function DiningSessionDetailsDialog({ session, capacity, waiters, saving, canCancel, onSave, onAction }:
  { session: DiningSession; capacity: number; waiters: Waiter[]; saving: boolean; canCancel: boolean;
    onSave: (input: SessionInput) => void; onAction: (action: 'close' | 'cancel') => void }) {
  const [editing, setEditing] = useState(false);
  const [guests, setGuests] = useState(String(session.guestCount));
  const [waiterId, setWaiterId] = useState(session.waiterId ?? '');
  const [notes, setNotes] = useState(session.notes ?? '');
  return <Stack spacing={2}>
    <DiningSessionStatusChip status={session.status} />
    <Typography>Area: {session.areaName ?? 'Unknown'}</Typography>
    <Typography>Assigned tables: {session.tables?.map(t => `${t.tableNumber} (${t.capacity})`).join(', ') ?? session.tableIds.join(', ')}</Typography>
    <Typography>Combined capacity: {session.combinedCapacity ?? capacity}</Typography>
    {session.closedAt && <Typography>Closed: {new Date(session.closedAt).toLocaleString()}</Typography>}
    <Typography>Guests: {session.guestCount}</Typography>
    <Typography>Waiter: {session.waiterName ?? 'Unassigned'}</Typography>
    <Typography>Opened: {new Date(session.openedAt).toLocaleString()}</Typography>
    <Typography sx={{ whiteSpace: 'pre-wrap' }}>Notes: {session.notes ?? 'None'}</Typography>
    <Typography variant="body2" color="text.secondary">Session: {session.id}</Typography>
    {editing && <DiningSessionForm {...{ guests, waiterId, notes, capacity, waiters }} disabled={saving}
      onGuests={setGuests} onWaiter={setWaiterId} onNotes={setNotes} />}
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {editing ? <><Button disabled={saving || !validSessionInput(guests, capacity, notes)} onClick={() => onSave({ guestCount: Number(guests), waiterId: waiterId || null, notes: notes.trim() || null })}>Save session</Button>
        <Button disabled={saving} onClick={() => setEditing(false)}>Discard edits</Button></> :
        <Button disabled={saving} onClick={() => setEditing(true)}>Edit session</Button>}
      <Button disabled={saving} onClick={() => onAction('close')}>Close dining session</Button>
      {canCancel && <Button color="error" disabled={saving} onClick={() => onAction('cancel')}>Cancel dining session</Button>}
    </Stack>
  </Stack>;
}
