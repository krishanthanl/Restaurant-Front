import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError } from 'axios';
import { AuthProvider } from './AuthProvider';
import { LoginPage } from './LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './useAuth';
import { tokenStore } from './tokenStore';
import { apiClient } from '../../services/apiClient';

vi.mock('../../services/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const user = { id: 'staff-1', username: 'admin', fullName: 'Test Administrator', role: 'Admin' };
const token = () => `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
function Workspace() {
  const auth = useAuth();
  return <><h1>Workspace for {auth.user?.fullName}</h1><button onClick={auth.logout}>Log out</button></>;
}
function renderApp(path = '/private') {
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route path="*" element={<Workspace />} /></Route>
  </Routes></AuthProvider></MemoryRouter>);
}
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); localStorage.clear(); });
afterEach(cleanup);

describe('Authentication', () => {
  it('protects routes and validates required fields without submitting', async () => {
    renderApp();
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your username or email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: /Workspace/ })).not.toBeInTheDocument();
  });

  it('logs in, stores one tab-scoped token, then logs out and protects the route again', async () => {
    const accessToken = token();
    vi.mocked(apiClient.post).mockResolvedValue({ data: { accessToken, user } });
    renderApp();
    await userEvent.type(await screen.findByLabelText(/Username or email/), 'admin');
    await userEvent.type(screen.getByLabelText(/Password/), 'test-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Workspace for Test Administrator' })).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', { username: 'admin', password: 'test-password' });
    expect(tokenStore.get()).toBe(accessToken);
    expect(localStorage.getItem('access_token')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('displays a safe message after invalid credentials', async () => {
    const error = new AxiosError('secret backend error');
    Object.assign(error, { response: { status: 401 } });
    vi.mocked(apiClient.post).mockRejectedValue(error);
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText(/Username or email/), 'admin');
    await userEvent.type(screen.getByLabelText(/Password/), 'incorrect');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(screen.queryByText('secret backend error')).not.toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('restores the session through me and clears it on unauthorized', async () => {
    tokenStore.set(token());
    vi.mocked(apiClient.get).mockResolvedValue({ data: user });
    renderApp();
    expect(await screen.findByRole('heading', { name: /Workspace for/ })).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    act(() => window.dispatchEvent(new CustomEvent('auth:unauthorized')));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('rejects an expired stored token without making an API call', async () => {
    tokenStore.set(`header.${btoa(JSON.stringify({ exp: 1 }))}.signature`);
    renderApp();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBeNull();
  });

  it('clears the session when restoration fails', async () => {
    tokenStore.set(token());
    vi.mocked(apiClient.get).mockRejectedValue(new Error('unauthorized'));
    renderApp();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('does not restore a late response after logout', async () => {
    tokenStore.set(token());
    let resolve!: (response: { data: typeof user }) => void;
    vi.mocked(apiClient.get).mockReturnValue(new Promise((done) => { resolve = done; }));
    renderApp();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    act(() => window.dispatchEvent(new CustomEvent('auth:unauthorized')));
    await act(async () => resolve({ data: user }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });
});
