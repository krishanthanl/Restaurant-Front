import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { PermissionOverride, UserOptions } from './userApi';

export function UserPermissionEditor({ options, inherited, value, onChange, disabled, isAdmin }: {
  options: UserOptions; inherited: string[]; value: PermissionOverride[];
  onChange: (value: PermissionOverride[]) => void; disabled: boolean; isAdmin: boolean;
}) {
  return <Stack spacing={2}>
    <Typography variant="body2" color="text.secondary">Inherit uses the role's permissions. Allow and Deny apply only to this user.</Typography>
    {options.permissions.map(({ key, label }) => {
      const effect = value.find(x => x.permissionKey === key)?.effect ?? 'Inherit';
      const effective = effect === 'Allow' || (effect === 'Inherit' && inherited.includes(key));
      const locked = disabled || (isAdmin && key === 'users.manage');
      return <Box key={key} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 160 }}><Typography fontWeight={600}>{label}</Typography>
          <Typography variant="caption" color="text.secondary">Inherited: {inherited.includes(key) ? 'Allowed' : 'Denied'}</Typography></Box>
        <TextField select size="small" label={`${label} override`} value={effect} disabled={locked} sx={{ minWidth: 150 }}
          onChange={event => onChange([...value.filter(x => x.permissionKey !== key),
            ...(event.target.value === 'Inherit' ? [] : [{ permissionKey: key, effect: event.target.value as 'Allow' | 'Deny' }])])}>
          <MenuItem value="Inherit">Inherit</MenuItem>
          <MenuItem value="Allow" disabled={!options.allowablePermissions.includes(key)}>Allow</MenuItem>
          <MenuItem value="Deny">Deny</MenuItem>
        </TextField>
        <Chip size="small" label={`Effective: ${effective ? 'Allowed' : 'Denied'}`} color={effective ? 'success' : 'default'} />
      </Box>;
    })}
  </Stack>;
}
