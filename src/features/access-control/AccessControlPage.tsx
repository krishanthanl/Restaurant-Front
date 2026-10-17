import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Checkbox, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState, LoadingState } from '../../components/ContentState';
import { getApiErrorMessage } from '../../services/apiClient';
import { Permissions } from '../authentication/permissions';
import { accessControlApi, type AccessControl, type RolePermissions } from './accessControlApi';

export function AccessControlPage() {
  const [access, setAccess] = useState<AccessControl | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const value = await accessControlApi.get();
      setAccess(value);
      setDrafts(Object.fromEntries(value.roles.map((role) => [role.role, [...role.permissionKeys]])));
    } catch (loadError) { setError(getApiErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toggle = (role: string, permission: string) => setDrafts((current) => {
    const selected = current[role] ?? [];
    return { ...current, [role]: selected.includes(permission) ? selected.filter((key) => key !== permission) : [...selected, permission] };
  });

  const save = async (role: RolePermissions) => {
    if (!access) return;
    setSaving(role.role); setError(null); setFeedback(null);
    const ordered = access.permissions.map((permission) => permission.key).filter((key) => drafts[role.role]?.includes(key));
    try {
      const updated = await accessControlApi.updateRole(role.role, ordered, role.rowVersion);
      setAccess((current) => current && ({ ...current, roles: current.roles.map((item) => item.role === role.role ? updated : item) }));
      setDrafts((current) => ({ ...current, [role.role]: [...updated.permissionKeys] }));
      setFeedback(`${role.role} permissions updated.`);
    } catch (saveError) { setError(getApiErrorMessage(saveError)); }
    finally { setSaving(null); }
  };

  return <>
    <PageHeader eyebrow="Administration" title="Access control" description="Configure what each staff role can do in this restaurant." />
    {loading ? <LoadingState label="Loading access control…" /> : error && !access ? <ErrorState message={error} onRetry={() => void load()} /> : access &&
      <Card><CardContent>
        {feedback && <Alert severity="success" sx={{ mb: 2 }}>{feedback}</Alert>}
        {error && <Alert severity="error" action={<Button onClick={() => void load()}>Reload</Button>} sx={{ mb: 2 }}>{error}</Alert>}
        <TableContainer><Table aria-label="Role permissions">
          <TableHead><TableRow><TableCell>Role</TableCell>{access.permissions.map((permission) =>
            <TableCell key={permission.key} align="center"><Typography variant="caption">{permission.label}</Typography></TableCell>)}<TableCell /></TableRow></TableHead>
          <TableBody>{access.roles.map((role) => <TableRow key={role.role}>
            <TableCell component="th" scope="row"><strong>{role.role}</strong></TableCell>
            {access.permissions.map((permission) => {
              const locked = role.role === 'Admin' && permission.key === Permissions.usersManage;
              return <TableCell key={permission.key} align="center"><Checkbox
                inputProps={{ 'aria-label': `${role.role} ${permission.label}` }}
                checked={drafts[role.role]?.includes(permission.key) ?? false}
                disabled={locked || saving === role.role}
                onChange={() => toggle(role.role, permission.key)} /></TableCell>;
            })}
            <TableCell><Stack alignItems="flex-end"><Button variant="contained" disabled={saving === role.role}
              aria-label={`Save ${role.role} permissions`} onClick={() => void save(role)}>Save</Button></Stack></TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>
      </CardContent></Card>}
  </>;
}
