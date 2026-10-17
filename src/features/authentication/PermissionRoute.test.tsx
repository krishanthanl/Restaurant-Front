import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PermissionRoute } from './PermissionRoute';
import { useAuth } from './useAuth';

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }));

describe('PermissionRoute', () => {
  it('renders a forbidden page without ending the authenticated session', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, isLoading: false,
      hasPermission: () => false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter initialEntries={['/admin']}><Routes>
      <Route element={<PermissionRoute permission="users.manage" />}><Route path="/admin" element={<h1>Admin tools</h1>} /></Route>
      <Route path="/forbidden" element={<h1>Access forbidden</h1>} />
    </Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Access forbidden' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin tools' })).not.toBeInTheDocument();
  });
});
