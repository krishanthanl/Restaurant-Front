import { Alert, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export function ForbiddenPage() {
  const navigate = useNavigate();
  return <Stack spacing={2} sx={{ maxWidth: 560 }}>
    <Typography variant="h4">Access forbidden</Typography>
    <Alert severity="warning">You are signed in, but you do not have permission to open this page.</Alert>
    <Button variant="contained" onClick={() => navigate('/', { replace: true })}>Return to workspace</Button>
  </Stack>;
}
