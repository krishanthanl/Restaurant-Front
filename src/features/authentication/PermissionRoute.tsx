import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function PermissionRoute({ permission, roles }: { permission: string; roles?: string[] }) {
  const { hasPermission, user } = useAuth();
  const location = useLocation();
  return hasPermission(permission) && (!roles || (user && roles.includes(user.role))) ? <Outlet /> : <Navigate to="/forbidden" replace state={{ from: location.pathname }} />;
}
