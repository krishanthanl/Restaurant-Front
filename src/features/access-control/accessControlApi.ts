import { apiClient } from '../../services/apiClient';

export interface PermissionDescriptor { key: string; label: string }
export interface RolePermissions { role: string; permissionKeys: string[]; rowVersion: string }
export interface AccessControl { permissions: PermissionDescriptor[]; roles: RolePermissions[] }

export const accessControlApi = {
  async get(): Promise<AccessControl> {
    return (await apiClient.get<AccessControl>('/access-control')).data;
  },
  async updateRole(role: string, permissionKeys: string[], rowVersion: string): Promise<RolePermissions> {
    return (await apiClient.put<RolePermissions>(`/access-control/roles/${encodeURIComponent(role)}`,
      { permissionKeys, rowVersion })).data;
  },
};
