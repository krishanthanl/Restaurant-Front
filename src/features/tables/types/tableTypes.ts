export const tableTypes = ['Normal', 'Booth', 'Counter', 'Private room'] as const;
export interface RestaurantTable {
 id: string; restaurantId: string; areaId: string; tableNumber: string; name: string | null;
 capacity: number; tableType: number; displayOrder: number; isActive: boolean;
 createdAtUtc: string; updatedAtUtc: string | null; rowVersion: string;
}
export interface TableInput {
 areaId: string; tableNumber: string; name: string; capacity: number; tableType: number; displayOrder: number; isActive: boolean;
}
export type TableFilter = 'all' | 'active' | 'inactive';
