import { apiClient } from '../../../services/apiClient';
import type { CategoryInput, MenuCategory, MenuItem, MenuItemInput, MenuItemQuery, PagedResponse } from '../types/menuTypes';

export const menuApi = {
  async getCategories(includeInactive = true, search?: string) {
    const { data } = await apiClient.get<MenuCategory[]>('/menu-categories', { params: { includeInactive, search: search || undefined } });
    return data;
  },
  async getCategory(id: string) {
    const { data } = await apiClient.get<MenuCategory>(`/menu-categories/${id}`);
    return data;
  },
  async createCategory(input: CategoryInput) {
    const { data } = await apiClient.post<MenuCategory>('/menu-categories', input);
    return data;
  },
  async updateCategory(id: string, input: CategoryInput, rowVersion: string) {
    const { data } = await apiClient.put<MenuCategory>(`/menu-categories/${id}`, { ...input, rowVersion });
    return data;
  },
  async setCategoryStatus(category: MenuCategory, isActive: boolean) {
    const { data } = await apiClient.put<MenuCategory>(`/menu-categories/${category.id}/status`, { isActive, rowVersion: category.rowVersion });
    return data;
  },
  async getItems(query: MenuItemQuery) {
    const { data } = await apiClient.get<PagedResponse<MenuItem>>('/menu-items', { params: { ...query, search: query.search || undefined, categoryId: query.categoryId || undefined } });
    return data;
  },
  async getItem(id: string) {
    const { data } = await apiClient.get<MenuItem>(`/menu-items/${id}`);
    return data;
  },
  async createItem(input: MenuItemInput) {
    const payload = { ...input, description: input.description || null, imagePath: input.imagePath || null, price: Number(input.price) };
    const { data } = await apiClient.post<MenuItem>('/menu-items', payload);
    return data;
  },
  async updateItem(id: string, input: MenuItemInput, rowVersion: string) {
    const payload = { ...input, description: input.description || null, imagePath: input.imagePath || null, price: Number(input.price), rowVersion };
    const { data } = await apiClient.put<MenuItem>(`/menu-items/${id}`, payload);
    return data;
  },
  async setItemStatus(item: MenuItem, isActive: boolean) {
    const { data } = await apiClient.put<MenuItem>(`/menu-items/${item.id}/status`, { isActive, rowVersion: item.rowVersion });
    return data;
  },
  async setItemAvailability(item: MenuItem, isAvailable: boolean) {
    const { data } = await apiClient.put<MenuItem>(`/menu-items/${item.id}/availability`, { isAvailable, rowVersion: item.rowVersion });
    return data;
  },
};
