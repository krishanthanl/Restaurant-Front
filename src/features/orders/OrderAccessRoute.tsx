import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../authentication/useAuth';
import { Permissions } from '../authentication/permissions';

export function OrderAccessRoute() {
  const { hasPermission } = useAuth();
  return hasPermission(Permissions.ordersCreate) || hasPermission(Permissions.ordersSubmit) || hasPermission(Permissions.billingManage)
    ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
