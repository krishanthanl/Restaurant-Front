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
  kitchenId: string;
  kitchenName: string;
  isKitchenActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface PagedResponse<T> { items: T[]; page: number; pageSize: number; totalCount: number; }
export interface CategoryInput { name: string; description: string; imagePath: string; displayOrder: number; }
export interface MenuItemInput { name: string; description: string; price: string; categoryId: string; kitchenId: string; imagePath: string; isAvailable: boolean; }
export interface MenuItemQuery { page: number; pageSize: number; search?: string; categoryId?: string; kitchenId?: string; isActive?: boolean; isAvailable?: boolean; isKitchenActive?: boolean; }

// GET/PUT /menu-items/{id}/kitchen. menuItemRowVersion is the item's version, sent back with the next assignment.
export interface MenuItemKitchenAssignment {
  menuItemId: string;
  kitchenId: string;
  kitchenName: string;
  kitchenCode: string;
  isKitchenActive: boolean;
  isOrderable: boolean;
  menuItemRowVersion: string;
}
