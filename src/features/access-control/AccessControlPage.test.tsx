import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessControlPage } from './AccessControlPage';
import { accessControlApi } from './accessControlApi';

vi.mock('./accessControlApi', () => ({ accessControlApi: { get: vi.fn(), updateRole: vi.fn() } }));

const access = {
  permissions: [
    { key: 'menu.manage', label: 'Menu Manage' },
    { key: 'users.manage', label: 'Users Manage' },
  ],
  roles: [
    { role: 'Admin', permissionKeys: ['menu.manage', 'users.manage'], rowVersion: 'admin-v1' },
    { role: 'Manager', permissionKeys: ['menu.manage'], rowVersion: 'manager-v1' },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(accessControlApi.get).mockResolvedValue(access);
  vi.mocked(accessControlApi.updateRole).mockImplementation(async (role, permissionKeys) =>
    ({ role, permissionKeys, rowVersion: `${role}-v2` }));
});
afterEach(cleanup);

describe('AccessControlPage', () => {
  it('locks the administrator safety permission and saves role changes with its row version', async () => {
    const user = userEvent.setup();
    render(<AccessControlPage />);
    const matrix = await screen.findByRole('table', { name: 'Role permissions' });
    expect(within(matrix).getByRole('checkbox', { name: 'Admin Users Manage' })).toBeDisabled();

    await user.click(within(matrix).getByRole('checkbox', { name: 'Manager Users Manage' }));
    await user.click(screen.getByRole('button', { name: 'Save Manager permissions' }));

    await waitFor(() => expect(accessControlApi.updateRole).toHaveBeenCalledWith(
      'Manager', ['menu.manage', 'users.manage'], 'manager-v1'));
    expect(await screen.findByText('Manager permissions updated.')).toBeInTheDocument();
  });
});
