import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/ContentState';
import { getApiErrorMessage } from '../../services/apiClient';
import { useAuth } from '../authentication/useAuth';
import { userApi, type ManagedUser, type PermissionOverride, type StaffRole, type UserOptions, type UserPage, type UserProfile } from './userApi';
import { UserPermissionEditor } from './UserPermissionEditor';

type DialogMode = 'create' | 'edit' | 'permissions' | 'status';
const emptyProfile: UserProfile = { username: '', email: '', fullName: '', role: 'Waiter' };

export function UsersPage() {
  const { user: actor } = useAuth();
  const [data, setData] = useState<UserPage | null>(null);
  const [options, setOptions] = useState<UserOptions | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mode, setMode] = useState<DialogMode | null>(null);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [password, setPassword] = useState('');
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [reason, setReason] = useState('');
  const busy = useRef(false);
  const loadGeneration = useRef(0);
  const filters = { search, role: role || undefined, isActive: status === 'all' ? undefined : status === 'active', page: page + 1, pageSize };

  const load = useCallback(async () => {
    const current = ++loadGeneration.current;
    setLoading(true);
    try {
      const [users, settings] = await Promise.all([userApi.list({ search, role: role || undefined,
        isActive: status === 'all' ? undefined : status === 'active', page: page + 1, pageSize }), userApi.options()]);
      if (current === loadGeneration.current) { setData(users); setOptions(settings); setError(null); }
    } catch (e) { if (current === loadGeneration.current) setError(getApiErrorMessage(e)); }
    finally { if (current === loadGeneration.current) setLoading(false); }
  }, [search, role, status, page, pageSize]);
  useEffect(() => { void load(); return () => { loadGeneration.current += 1; }; }, [load]);

  const fill = (target: ManagedUser) => {
    setSelected(target);
    setProfile({ username: target.username, email: target.email, fullName: target.fullName, role: target.role });
    setOverrides(target.permissionOverrides);
  };
  const open = async (nextMode: DialogMode, id?: string) => {
    if (busy.current) return;
    busy.current = true; setOpening(true); setDialogError(null); setError(null); setFeedback(null); setReason(''); setPassword('');
    try {
      if (id) fill(await userApi.get(id));
      else { setSelected(null); setProfile(emptyProfile); setOverrides([]); }
      setMode(nextMode);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setOpening(false); busy.current = false; }
  };
  const close = () => { if (!busy.current) { setMode(null); setPassword(''); setDialogError(null); } };
  const save = async () => {
    if (busy.current || !mode) return;
    busy.current = true; setSaving(true); setDialogError(null);
    try {
      if (mode === 'create') await userApi.create({ ...profile, password, permissionOverrides: overrides });
      else if (selected && mode === 'edit') await userApi.update(selected.id, profile, selected.rowVersion);
      else if (selected && mode === 'permissions') await userApi.permissions(selected.id, overrides, selected.rowVersion);
      else if (selected && mode === 'status') await userApi.status(selected.id, !selected.isActive, selected.rowVersion, selected.isActive ? reason.trim() : undefined);
      else return;
      setMode(null); setPassword(''); setFeedback(mode === 'create' ? 'User created. Share the initial password privately.' : 'User updated.');
      await load();
    } catch (e) {
      const message = getApiErrorMessage(e);
      try {
        const [settings, users, fresh] = await Promise.all([userApi.options(), userApi.list(filters), selected ? userApi.get(selected.id) : Promise.resolve(null)]);
        setOptions(settings); setData(users);
        if (fresh) fill(fresh);
        setDialogError(message);
      } catch {
        // Closing prevents retrying a write with an unrefreshed version or authorization state.
        setMode(null); setPassword(''); setError(`${message} Reload users before trying again.`);
      }
    } finally { busy.current = false; setSaving(false); }
  };
  const self = selected?.id === actor?.id;
  const inherited = options?.roles.find(x => x.role === profile.role)?.permissionKeys ?? selected?.rolePermissions ?? [];
  const profileInvalid = !profile.fullName.trim() || !profile.username.trim() || !profile.email.trim() ||
    (mode === 'create' && password.length < 12);
  const title = mode === 'create' ? 'Create user' : mode === 'edit' ? 'Edit user' : mode === 'permissions' ? 'User permissions' : selected?.isActive ? 'Deactivate user' : 'Reactivate user';

  return <>
    <PageHeader eyebrow="Administration" title="Users" description="Manage staff accounts and individual access." />
    {feedback && <Alert severity="success" sx={{ mb: 2 }}>{feedback}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={() => void load()}>Reload</Button>}>{error}</Alert>}
    <Card><CardContent>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField label="Search users" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} sx={{ flex: 1 }} />
        <TextField select label="Role filter" value={role} onChange={e => { setRole(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
          <MenuItem value="">All roles</MenuItem>{options?.roles.map(x => <MenuItem key={x.role} value={x.role}>{x.role}</MenuItem>)}
        </TextField>
        <TextField select label="Status filter" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
          <MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        <Button variant="contained" disabled={!options || opening || saving || loading || !!error} onClick={() => void open('create')}>Create user</Button>
      </Stack>
      {loading ? <LoadingState label="Loading users…" /> : <>
        <TableContainer><Table aria-label="Staff users"><TableHead><TableRow>
          <TableCell>Name</TableCell><TableCell>Username</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
        </TableRow></TableHead><TableBody>{data?.items.map(item => <TableRow key={item.id}>
          <TableCell>{item.fullName}</TableCell><TableCell>{item.username}</TableCell><TableCell>{item.email}</TableCell><TableCell>{item.role}</TableCell>
          <TableCell><Chip size="small" label={item.isActive ? 'Active' : 'Inactive'} color={item.isActive ? 'success' : 'default'} /></TableCell>
          <TableCell><Stack direction="row" spacing={1}>
            <Button aria-label={`Edit ${item.fullName}`} disabled={opening || saving || !!error} onClick={() => void open('edit', item.id)}>Edit</Button>
            <Button aria-label={`Permissions for ${item.fullName}`} disabled={opening || saving || !!error || item.id === actor?.id} onClick={() => void open('permissions', item.id)}>Permissions</Button>
            <Button aria-label={`${item.isActive ? 'Deactivate' : 'Reactivate'} ${item.fullName}`} color={item.isActive ? 'error' : 'primary'}
              disabled={opening || saving || !!error || item.id === actor?.id} onClick={() => void open('status', item.id)}>{item.isActive ? 'Deactivate' : 'Reactivate'}</Button>
          </Stack></TableCell>
        </TableRow>)}</TableBody></Table></TableContainer>
        {data?.totalCount === 0 && <Typography sx={{ py: 3 }}>No users match these filters.</Typography>}
        <TablePagination component="div" count={data?.totalCount ?? 0} page={page} rowsPerPage={pageSize}
          onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20, 50]} />
      </>}
    </CardContent></Card>
    <Dialog open={mode !== null} onClose={close} fullWidth maxWidth={mode === 'permissions' || mode === 'create' ? 'md' : 'sm'}>
      <DialogTitle>{title}{selected ? ` — ${selected.fullName}` : ''}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {dialogError && <Alert severity="error">{dialogError}</Alert>}
        {(mode === 'create' || mode === 'edit') && <>
          <TextField label="Full name" required value={profile.fullName} disabled={saving} inputProps={{ maxLength: 150 }} onChange={e => setProfile({ ...profile, fullName: e.target.value })} />
          <TextField label="Username" required value={profile.username} disabled={saving} inputProps={{ maxLength: 100 }} onChange={e => setProfile({ ...profile, username: e.target.value })} />
          <TextField label="Email" type="email" required value={profile.email} disabled={saving} inputProps={{ maxLength: 254 }} onChange={e => setProfile({ ...profile, email: e.target.value })} />
          <TextField select label="Role" value={profile.role} disabled={saving || self} onChange={e => { setProfile({ ...profile, role: e.target.value as StaffRole });
            if (e.target.value === 'Admin') setOverrides(current => current.filter(x => x.permissionKey !== 'users.manage')); }}>
            {options?.roles.map(x => <MenuItem key={x.role} value={x.role}>{x.role}</MenuItem>)}
          </TextField>
          {mode === 'create' && <TextField label="Initial password" type="password" autoComplete="new-password" value={password} required disabled={saving}
            inputProps={{ minLength: 12, maxLength: 1024 }} helperText="At least 12 characters. Share privately with this user." onChange={e => setPassword(e.target.value)} />}
        </>}
        {(mode === 'permissions' || mode === 'create') && options && <UserPermissionEditor options={options} inherited={inherited}
          value={overrides} onChange={setOverrides} disabled={saving || !!self} isAdmin={profile.role === 'Admin'} />}
        {mode === 'status' && <>
          <Typography>{selected?.isActive ? 'This user will immediately lose access and all active sessions will end. Historical records will be retained.' : 'This user can sign in again. Previous sessions will remain revoked.'}</Typography>
          {selected?.isActive && <TextField label="Reason" required multiline value={reason} disabled={saving} inputProps={{ maxLength: 500 }} onChange={e => setReason(e.target.value)} />}
        </>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={close} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving || ((mode === 'create' || mode === 'edit') && profileInvalid) || (mode === 'status' && !!selected?.isActive && !reason.trim())}
          onClick={() => void save()}>{saving ? 'Saving…' : mode === 'create' ? 'Create account' : mode === 'permissions' ? 'Save permissions' : mode === 'status' ? selected?.isActive ? 'Confirm deactivation' : 'Confirm reactivation' : 'Save user'}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
