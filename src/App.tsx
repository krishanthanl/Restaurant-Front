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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="restaurant/table-dashboard" element={<TableDashboardPage />} />
          <Route path="restaurant/tables" element={<TableManagementPage />} />
          <Route path="restaurant/areas" element={<AreaManagementPage />} />
          <Route index element={<Navigate to="/menu/items" replace />} />
          <Route path="menu/categories" element={<CategoryManagementPage />} />
          <Route path="menu/items" element={<MenuItemsPage />} />
          <Route path="menu/items/new" element={<MenuItemFormPage />} />
          <Route path="menu/items/:id/edit" element={<MenuItemFormPage />} />
          <Route path="*" element={<Navigate to="/menu/items" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
