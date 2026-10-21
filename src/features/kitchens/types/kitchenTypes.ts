export interface Kitchen {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  activeMenuItemCount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface KitchenInput {
  name: string;
  code: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export type KitchenFilter = 'all' | 'active' | 'inactive';
