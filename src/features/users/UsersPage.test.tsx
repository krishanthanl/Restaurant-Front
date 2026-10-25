import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UsersPage } from './UsersPage';
import { userApi, type ManagedUser, type UserOptions } from './userApi';

vi.mock('./userApi', () => ({ userApi: { list: vi.fn(), options: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), permissions: vi.fn(), status: vi.fn() } }));
vi.mock('../authentication/useAuth', () => ({ useAuth: () => ({ user: { id: 'actor', role: 'Admin', permissions: ['users.manage'] } }) }));
const staff: ManagedUser = { id: 'staff', username: 'waiter', email: 'waiter@example.invalid', fullName: 'Test Waiter', role: 'Waiter', isActive: true,
  rowVersion: 'v1', rolePermissions: ['orders.create'], permissionOverrides: [], effectivePermissions: ['orders.create'] };
const options: UserOptions = { permissions: [{ key: 'orders.create', label: 'Orders Create' }, { key: 'menu.manage', label: 'Menu Manage' }],
  roles: [{ role: 'Waiter', permissionKeys: ['orders.create'], rowVersion: '' }], allowablePermissions: ['orders.create'] };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(userApi.list).mockResolvedValue({ items: [staff], totalCount: 1, page: 1, pageSize: 20 });
  vi.mocked(userApi.options).mockResolvedValue(options);
  vi.mocked(userApi.get).mockResolvedValue(staff);
  vi.mocked(userApi.status).mockResolvedValue({ ...staff, isActive: false, rowVersion: 'v2' });
  vi.mocked(userApi.permissions).mockResolvedValue({ ...staff, rowVersion: 'v2' });
});
afterEach(cleanup);

it('lists users and sends search and status filters to the API', async () => {
  const user = userEvent.setup(); render(<UsersPage />);
  expect(await screen.findByText('Test Waiter')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Search users'), 'waiter');
  await waitFor(() => expect(userApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'waiter', page: 1 })));
  await user.click(screen.getByLabelText('Status filter'));
  await user.click(screen.getByRole('option', { name: 'Inactive' }));
  await waitFor(() => expect(userApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ isActive: false })));
});

it('requires a reason, confirms deactivation, and prevents duplicate submissions', async () => {
  const user = userEvent.setup(); render(<UsersPage />);
  await user.click(await screen.findByRole('button', { name: 'Deactivate Test Waiter' }));
  const confirm = screen.getByRole('button', { name: 'Confirm deactivation' });
  expect(confirm).toBeDisabled();
  await user.type(screen.getByLabelText(/^Reason/), 'Left restaurant');
  let complete!: (value: typeof staff) => void;
  vi.mocked(userApi.status).mockReturnValue(new Promise(resolve => { complete = resolve; }));
  await user.dblClick(confirm);
  expect(userApi.status).toHaveBeenCalledTimes(1);
  expect(userApi.status).toHaveBeenCalledWith('staff', false, 'v1', 'Left restaurant');
  complete(staff);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('shows inherited and effective permissions and saves overrides with row version', async () => {
  const user = userEvent.setup(); render(<UsersPage />);
  await user.click(await screen.findByRole('button', { name: 'Permissions for Test Waiter' }));
  expect(await screen.findByText('Inherited: Allowed')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Orders Create override'));
  await user.click(screen.getByRole('option', { name: 'Deny' }));
  await user.click(screen.getByRole('button', { name: 'Save permissions' }));
  await waitFor(() => expect(userApi.permissions).toHaveBeenCalledWith('staff', [{ permissionKey: 'orders.create', effect: 'Deny' }], 'v1'));
});

it('refreshes stale data and keeps the backend error visible before retry', async () => {
  const user = userEvent.setup(); render(<UsersPage />);
  await user.click(await screen.findByRole('button', { name: 'Edit Test Waiter' }));
  await screen.findByLabelText(/^Full name/);
  vi.mocked(userApi.update).mockRejectedValue(new Error('User changed. Refresh and try again.'));
  vi.mocked(userApi.get).mockResolvedValue({ ...staff, rowVersion: 'v2', fullName: 'Refreshed Waiter' });
  await user.click(screen.getByRole('button', { name: 'Save user' }));
  expect(await screen.findByText('User changed. Refresh and try again.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveValue('Refreshed Waiter'));
});

it('creates an account with an initial password and inherited permissions', async () => {
  const user = userEvent.setup(); render(<UsersPage />);
  await screen.findByText('Test Waiter');
  await user.click(screen.getByRole('button', { name: 'Create user' }));
  const submit = await screen.findByRole('button', { name: 'Create account' });
  expect(submit).toBeDisabled();
  for (const [label, value] of [[/^Full name/, 'New Waiter'], [/^Username/, 'newwaiter'],
    [/^Email/, 'newwaiter@example.invalid'], [/^Initial password/, 'Initial-test-password']] as const) {
    await user.click(screen.getByLabelText(label));
    await user.paste(value);
  }
  vi.mocked(userApi.create).mockResolvedValue(staff);
  await user.click(submit);
  await waitFor(() => expect(userApi.create).toHaveBeenCalledWith({ fullName: 'New Waiter', username: 'newwaiter', email: 'newwaiter@example.invalid', role: 'Waiter', password: 'Initial-test-password', permissionOverrides: [] }));
  expect(await screen.findByText(/User created/)).toBeInTheDocument();
});

it('reactivates inactive accounts without requiring a deactivation reason', async () => {
  const user = userEvent.setup();
  vi.mocked(userApi.list).mockResolvedValue({ items: [{ ...staff, isActive: false }], totalCount: 1, page: 1, pageSize: 20 });
  vi.mocked(userApi.get).mockResolvedValue({ ...staff, isActive: false });
  render(<UsersPage />);
  await user.click(await screen.findByRole('button', { name: 'Reactivate Test Waiter' }));
  await user.click(await screen.findByRole('button', { name: 'Confirm reactivation' }));
  await waitFor(() => expect(userApi.status).toHaveBeenCalledWith('staff', true, 'v1', undefined));
});
