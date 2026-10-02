import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import axios from 'axios';
import { useAuth } from './useAuth';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const from = (location.state as { from?: string } | null)?.from;
  const destination = from?.startsWith('/') && !from.startsWith('//') && from.split('?')[0] !== '/login' ? from : '/menu/items';
  if (isLoading) return <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress aria-label="Restoring session" /></Box>;
  if (isAuthenticated) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError('');
    if (!username.trim() || !password.trim() || busy) return;
    setBusy(true);
    try { await login(username, password); }
    catch (failure) {
      setError(axios.isAxiosError(failure) && failure.response?.status === 401
        ? 'Invalid username or password.'
        : axios.isAxiosError(failure) && failure.response?.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : 'Unable to sign in. Please try again.');
    } finally { setBusy(false); }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
    <Paper elevation={0} sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 5 }, border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
      <Stack component="form" noValidate onSubmit={submit} spacing={3}>
        <Box>
          <RestaurantMenuRoundedIcon color="primary" sx={{ fontSize: 40, mb: 2 }} />
          <Typography variant="h4" fontWeight={750}>Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Sign in to your Tasty Station workspace.</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Username or email" value={username} onChange={(event) => setUsername(event.target.value)}
          autoComplete="username" autoFocus required disabled={busy} inputProps={{ maxLength: 254 }}
          error={submitted && !username.trim()} helperText={submitted && !username.trim() ? 'Enter your username or email.' : undefined} />
        <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password" required disabled={busy} inputProps={{ maxLength: 1024 }}
          error={submitted && !password.trim()} helperText={submitted && !password.trim() ? 'Enter your password.' : undefined} />
        <Button type="submit" variant="contained" size="large" disabled={busy} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </Paper>
  </Box>;
}
