import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { CategoryManagementPage } from './features/menu/pages/CategoryManagementPage';
import { MenuItemFormPage } from './features/menu/pages/MenuItemFormPage';
import { MenuItemsPage } from './features/menu/pages/MenuItemsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/menu/items" replace />} />
        <Route path="menu/categories" element={<CategoryManagementPage />} />
        <Route path="menu/items" element={<MenuItemsPage />} />
        <Route path="menu/items/new" element={<MenuItemFormPage />} />
        <Route path="menu/items/:id/edit" element={<MenuItemFormPage />} />
        <Route path="*" element={<Navigate to="/menu/items" replace />} />
      </Route>
    </Routes>
  );
}
