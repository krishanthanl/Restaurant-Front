import { Chip, Stack } from '@mui/material';

interface Props { isActive: boolean; isAvailable: boolean; isOrderable: boolean; isKitchenActive: boolean }

export function MenuStatusChip({ isActive, isAvailable, isOrderable, isKitchenActive }: Props) {
  return <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>
    <Chip size="small" color={isActive ? 'success' : 'default'} label={isActive ? 'Active' : 'Inactive'} />
    <Chip size="small" color={isAvailable ? 'primary' : 'warning'} variant="outlined" label={isAvailable ? 'Available' : 'Unavailable'} />
    {!isOrderable && isActive && isAvailable && <Chip size="small" color="warning" label={isKitchenActive ? 'Category inactive' : 'Kitchen inactive'} />}
  </Stack>;
}
