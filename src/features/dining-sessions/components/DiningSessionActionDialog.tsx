import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
export function DiningSessionActionDialog({ action, reason, saving, onReason, onClose, onConfirm }:
  { action: 'close' | 'cancel' | null; reason: string; saving: boolean; onReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <Dialog open={action !== null} onClose={() => !saving && onClose()} fullWidth maxWidth="xs">
    <DialogTitle>{action === 'cancel' ? 'Cancel dining session?' : 'Close dining session?'}</DialogTitle>
    <DialogContent><Stack spacing={2}>
      <Typography>The visit will end and the table will be released. The session history will be retained.</Typography>
      {action === 'cancel' && <TextField label="Cancellation reason" value={reason} multiline onChange={e => onReason(e.target.value)}
        disabled={saving} error={reason.trim().length > 500} helperText="Required, up to 500 characters." />}
    </Stack></DialogContent>
    <DialogActions><Button disabled={saving} onClick={onClose}>Back</Button>
      <Button variant="contained" disabled={saving || (action === 'cancel' && (!reason.trim() || reason.trim().length > 500))} onClick={onConfirm}>Confirm</Button>
    </DialogActions>
  </Dialog>;
}
