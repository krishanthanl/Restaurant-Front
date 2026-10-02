export interface Area {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface AreaInput {
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export type AreaFilter = 'all' | 'active' | 'inactive';
