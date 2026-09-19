export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  displayOrder: number;
  isActive: boolean;
  itemCount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imagePath: string | null;
  isActive: boolean;
  isAvailable: boolean;
  isOrderable: boolean;
  categoryId: string;
  categoryName: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface PagedResponse<T> { items: T[]; page: number; pageSize: number; totalCount: number; }
export interface CategoryInput { name: string; description: string; imagePath: string; displayOrder: number; }
export interface MenuItemInput { name: string; description: string; price: string; categoryId: string; imagePath: string; isAvailable: boolean; }
export interface MenuItemQuery { page: number; pageSize: number; search?: string; categoryId?: string; isActive?: boolean; isAvailable?: boolean; }
