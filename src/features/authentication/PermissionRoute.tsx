import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function PermissionRoute({ permission }: { permission: string }) {
  const { hasPermission } = useAuth();
  const location = useLocation();
  return hasPermission(permission) ? <Outlet /> : <Navigate to="/forbidden" replace state={{ from: location.pathname }} />;
}
