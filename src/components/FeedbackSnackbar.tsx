import { Alert, Snackbar } from '@mui/material';

export interface Feedback { message: string; severity: 'success' | 'error'; }

export function FeedbackSnackbar({ feedback, onClose }: { feedback: Feedback | null; onClose: () => void }) {
  return <Snackbar open={Boolean(feedback)} autoHideDuration={4500} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
    <Alert severity={feedback?.severity ?? 'success'} variant="filled" onClose={onClose}>{feedback?.message}</Alert>
  </Snackbar>;
}
