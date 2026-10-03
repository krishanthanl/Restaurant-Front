import { Chip } from '@mui/material';
import { DiningSessionStatus } from '../types/diningSessionTypes';
export function DiningSessionStatusChip({ status }: { status: number }) {
  return <Chip label={status === DiningSessionStatus.Active ? 'Open' : status === DiningSessionStatus.Closed ? 'Closed' : 'Cancelled'}
    color={status === DiningSessionStatus.Active ? 'info' : 'default'} size="small" />;
}
