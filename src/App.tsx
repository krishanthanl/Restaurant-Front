import { ProtectedRoute } from './features/authentication/ProtectedRoute';
import { LoginPage } from './features/authentication/LoginPage';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { CategoryManagementPage } from './features/menu/pages/CategoryManagementPage';
import { MenuItemFormPage } from './features/menu/pages/MenuItemFormPage';
import { MenuItemsPage } from './features/menu/pages/MenuItemsPage';
import { AreaManagementPage } from './features/areas/pages/AreaManagementPage';

import { TableManagementPage } from './features/tables/pages/TableManagementPage';
import { TableDashboardPage } from './features/tables/pages/TableDashboardPage';
import { PermissionRoute } from './features/authentication/PermissionRoute';
import { ForbiddenPage } from './features/authentication/ForbiddenPage';
import { Permissions } from './features/authentication/permissions';
import { AccessControlPage } from './features/access-control/AccessControlPage';
import { KitchenManagementPage } from './features/kitchens/pages/KitchenManagementPage';
import { ActiveOrdersPage } from './features/orders/pages/ActiveOrdersPage';
import { OrderPage } from './features/orders/pages/OrderPage';
import { OrderAccessRoute } from './features/orders/OrderAccessRoute';
import { KitchenDisplayPage } from './features/kitchen/pages/KitchenDisplayPage';
import { BillingQueuePage } from './features/billing/BillingQueuePage';
import { BillingDetailPage } from './features/billing/BillingDetailPage';
import { BillingSettingsPage } from './features/billing/BillingSettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<OrderAccessRoute />}>
            <Route path="orders/active" element={<ActiveOrdersPage />} />
            <Route path="orders/:id" element={<OrderPage />} />
          </Route>
          <Route path="restaurant/table-dashboard" element={<TableDashboardPage />} />
          <Route path="restaurant/tables" element={<TableManagementPage />} />
          <Route path="restaurant/areas" element={<AreaManagementPage />} />
          <Route index element={<Navigate to="/menu/items" replace />} />
          <Route path="menu/categories" element={<CategoryManagementPage />} />
          <Route path="menu/items" element={<MenuItemsPage />} />
          <Route path="menu/kitchens" element={<KitchenManagementPage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route element={<PermissionRoute permission={Permissions.billingManage} />}>
            <Route path="billing" element={<BillingQueuePage />} />
            <Route path="billing/orders/:id" element={<BillingDetailPage />} />
          </Route>
          <Route element={<PermissionRoute permission={Permissions.billingSettingsManage} />}>
            <Route path="billing/settings" element={<BillingSettingsPage />} />
          </Route>
          <Route element={<PermissionRoute permission={Permissions.menuManage} />}>
            <Route path="menu/items/new" element={<MenuItemFormPage />} />
            <Route path="menu/items/:id/edit" element={<MenuItemFormPage />} />
          </Route>
          <Route element={<PermissionRoute permission={Permissions.kitchenManage} />}>
            <Route path="kitchen/display" element={<KitchenDisplayPage />} />
          </Route>
          <Route element={<PermissionRoute permission={Permissions.usersManage} />}>
            <Route path="administration/access-control" element={<AccessControlPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/menu/items" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
