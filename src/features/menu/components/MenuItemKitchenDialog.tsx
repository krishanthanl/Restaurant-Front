import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel,
  MenuItem as SelectOption, Select, Stack, Typography,
} from '@mui/material';
import type { Kitchen } from '../../kitchens/types/kitchenTypes';
import type { MenuItem } from '../types/menuTypes';

interface Props {
  item: MenuItem | null;
  kitchens: Kitchen[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (kitchenId: string) => Promise<void>;
}

export function MenuItemKitchenDialog({ item, kitchens, saving, onClose, onSubmit }: Props) {
  const [kitchenId, setKitchenId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeKitchens = kitchens.filter((kitchen) => kitchen.isActive);

  useEffect(() => {
    if (item) { setKitchenId(item.isKitchenActive ? item.kitchenId : ''); setError(null); }
  }, [item]);

  // UX only: the backend validates that the kitchen exists, belongs to this restaurant and is active.
  const submit = async () => {
    if (!item) return;
    if (!kitchenId) { setError('Choose a kitchen.'); return; }
    if (kitchenId === item.kitchenId && item.isKitchenActive) { setError(`${item.name} is already prepared in ${item.kitchenName}.`); return; }
    setError(null);
    await onSubmit(kitchenId);
  };

  return (
    <Dialog open={Boolean(item)} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Change kitchen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            Choose the kitchen that prepares <strong>{item?.name}</strong>. New orders go to this kitchen; tickets already sent keep their kitchen.
          </Typography>
          {item && !item.isKitchenActive && <Alert severity="warning">Currently assigned to {item.kitchenName}, which is inactive. The item cannot be ordered until it has an active kitchen.</Alert>}
          {activeKitchens.length === 0 && <Alert severity="warning">There are no active kitchens. Create or activate one under Kitchens first.</Alert>}
          <FormControl fullWidth error={Boolean(error)} disabled={saving}>
            <InputLabel id="menu-item-kitchen-dialog-label">Kitchen</InputLabel>
            <Select labelId="menu-item-kitchen-dialog-label" label="Kitchen" value={kitchenId} onChange={(event) => { setKitchenId(event.target.value); setError(null); }}>
              {activeKitchens.map((kitchen) => <SelectOption key={kitchen.id} value={kitchen.id}>{kitchen.name} ({kitchen.code})</SelectOption>)}
            </Select>
            <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: .5, ml: 1.75 }}>{error ?? 'Only active kitchens can be assigned.'}</Typography>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} loading={saving} disabled={activeKitchens.length === 0}>Save kitchen</Button>
      </DialogActions>
    </Dialog>
  );
}
