import { Chip, Stack } from '@mui/material';

export function MenuStatusChip({ isActive, isAvailable, isOrderable }: { isActive: boolean; isAvailable: boolean; isOrderable: boolean }) {
  return <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>
    <Chip size="small" color={isActive ? 'success' : 'default'} label={isActive ? 'Active' : 'Inactive'} />
    <Chip size="small" color={isAvailable ? 'primary' : 'warning'} variant="outlined" label={isAvailable ? 'Available' : 'Unavailable'} />
    {!isOrderable && isActive && isAvailable && <Chip size="small" color="warning" label="Category inactive" />}
  </Stack>;
}
