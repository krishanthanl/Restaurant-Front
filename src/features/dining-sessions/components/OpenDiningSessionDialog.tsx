import { Button } from '@mui/material';
import { DiningSessionForm } from './DiningSessionForm';
import { validSessionInput } from '../validation/diningSessionValidation';
import type { Waiter } from '../types/diningSessionTypes';
export function OpenDiningSessionDialog({ guests, waiterId, notes, capacity, waiters, disabled, onGuests, onWaiter, onNotes, onOpen }:
  { guests: string; waiterId: string; notes: string; capacity: number; waiters: Waiter[]; disabled: boolean;
    onGuests: (value: string) => void; onWaiter: (value: string) => void; onNotes: (value: string) => void; onOpen: () => void }) {
  return <>
    <DiningSessionForm {...{ guests, waiterId, notes, capacity, waiters, disabled, onGuests, onWaiter, onNotes }} />
    <Button variant="contained" onClick={onOpen} disabled={disabled || !validSessionInput(guests, capacity, notes)}>Open Table</Button>
  </>;
}
