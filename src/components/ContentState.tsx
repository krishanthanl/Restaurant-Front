import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <Box role="status" sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}><Box textAlign="center"><CircularProgress size={34} /><Typography color="text.secondary" mt={1.5}>{label}</Typography></Box></Box>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>Retry</Button>}>{message}</Alert>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <Box sx={{ py: 8, textAlign: 'center' }}><InboxOutlinedIcon sx={{ fontSize: 46, color: 'primary.main', mb: 1 }} /><Typography variant="h6">{title}</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>{action}</Box>;
}
