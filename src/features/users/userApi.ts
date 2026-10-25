import { apiClient } from '../../services/apiClient';

export type StaffRole = 'Admin' | 'Manager' | 'Cashier' | 'Waiter' | 'Kitchen';
export interface PermissionOverride { permissionKey: string; effect: 'Allow' | 'Deny' }
export interface UserSummary {
  id: string; username: string; email: string; fullName: string; role: StaffRole; isActive: boolean; rowVersion: string;
}
export interface ManagedUser extends UserSummary {
  permissionOverrides: PermissionOverride[]; rolePermissions: string[]; effectivePermissions: string[];
}
export interface UserPage { items: UserSummary[]; totalCount: number; page: number; pageSize: number }
export interface UserOptions {
  permissions: { key: string; label: string }[];
  roles: { role: StaffRole; permissionKeys: string[]; rowVersion: string }[];
  allowablePermissions: string[];
}
export interface UserProfile { username: string; email: string; fullName: string; role: StaffRole }
export interface UserFilters { search: string; role?: string; isActive?: boolean; page: number; pageSize: number }
export const userApi = {
  list: async (params: UserFilters) => (await apiClient.get<UserPage>('/users', { params })).data,
  options: async () => (await apiClient.get<UserOptions>('/users/options')).data,
  get: async (id: string) => (await apiClient.get<ManagedUser>(`/users/${id}`)).data,
  create: async (request: UserProfile & { password: string; permissionOverrides: PermissionOverride[] }) =>
    (await apiClient.post<ManagedUser>('/users', request)).data,
  update: async (id: string, profile: UserProfile, rowVersion: string) =>
    (await apiClient.put<ManagedUser>(`/users/${id}`, { ...profile, rowVersion })).data,
  permissions: async (id: string, permissionOverrides: PermissionOverride[], rowVersion: string) =>
    (await apiClient.put<ManagedUser>(`/users/${id}/permissions`, { permissionOverrides, rowVersion })).data,
  status: async (id: string, isActive: boolean, rowVersion: string, reason?: string) =>
    (await apiClient.put<ManagedUser>(`/users/${id}/status`, { isActive, rowVersion, reason })).data,
};
