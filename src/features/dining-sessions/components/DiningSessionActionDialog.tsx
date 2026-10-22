import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
export function DiningSessionActionDialog({ action, reason, saving, onReason, onClose, onConfirm }:
  { action: 'close' | 'cancel' | null; reason: string; saving: boolean; onReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  const invalid = !reason.trim() || reason.trim().length > 500;
  return <Dialog open={action !== null} onClose={() => !saving && onClose()} fullWidth maxWidth="xs">
    <DialogTitle>{action === 'cancel' ? 'Cancel dining session?' : 'Close dining session?'}</DialogTitle>
    <DialogContent><Stack spacing={2}>
      <Typography>The visit will end and the table will be released. The session history will be retained.</Typography>
      {action === 'close' && <Typography color="text.secondary">This visit has no order, so record why it is ending (for example, guests left before ordering).</Typography>}
      <TextField label={action === 'cancel' ? 'Cancellation reason' : 'Reason for closing'} value={reason} multiline onChange={e => onReason(e.target.value)}
        disabled={saving} error={reason.trim().length > 500} helperText="Required, up to 500 characters." />
    </Stack></DialogContent>
    <DialogActions><Button disabled={saving} onClick={onClose}>Back</Button>
      <Button variant="contained" disabled={saving || invalid} onClick={onConfirm}>Confirm</Button>
    </DialogActions>
  </Dialog>;
}
