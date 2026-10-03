import { MenuItem, Stack, TextField } from '@mui/material';
import type { Waiter } from '../types/diningSessionTypes';
export function DiningSessionForm({ guests, waiterId, notes, capacity, waiters, disabled, onGuests, onWaiter, onNotes }:
  { guests: string; waiterId: string; notes: string; capacity: number; waiters: Waiter[]; disabled: boolean;
    onGuests: (value: string) => void; onWaiter: (value: string) => void; onNotes: (value: string) => void }) {
  return <Stack spacing={2}>
    <TextField label="Number of guests" type="number" value={guests} onChange={e => onGuests(e.target.value)} disabled={disabled}
      slotProps={{ htmlInput: { min: 1, max: capacity, step: 1 } }} />
    <TextField select label="Waiter" value={waiterId} onChange={e => onWaiter(e.target.value)} disabled={disabled}>
      <MenuItem value="">Unassigned</MenuItem>
      {waiterId && !waiters.some(w => w.id === waiterId) && <MenuItem value={waiterId}>Previously assigned waiter</MenuItem>}
      {waiters.map(w => <MenuItem key={w.id} value={w.id}>{w.fullName}</MenuItem>)}
    </TextField>
    <TextField label="Session notes" multiline minRows={2} value={notes} onChange={e => onNotes(e.target.value)} disabled={disabled}
      error={notes.trim().length > 1000} helperText={notes.trim().length > 1000 ? 'Use up to 1000 characters.' : undefined} />
  </Stack>;
}
