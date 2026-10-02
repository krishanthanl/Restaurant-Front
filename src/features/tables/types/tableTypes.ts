export const tableTypes = ['Normal', 'Booth', 'Counter', 'Private room'] as const;
export interface RestaurantTable {
 id: string; restaurantId: string; areaId: string; tableNumber: string; name: string | null;
 capacity: number; tableType: number; displayOrder: number; isActive: boolean;
 currentStatus: number;
 createdAtUtc: string; updatedAtUtc: string | null; rowVersion: string;
}
export interface TableInput {
 areaId: string; tableNumber: string; name: string; capacity: number; tableType: number; displayOrder: number; isActive: boolean;
}
export type TableFilter = 'all' | 'active' | 'inactive';

export const tableStatuses = [
 { label: "Available", color: "success" }, { label: "Occupied", color: "info" },
 { label: "Reserved", color: "secondary" }, { label: "Payment Pending", color: "warning" },
 { label: "Cleaning", color: "warning" }, { label: "Out Of Service", color: "error" },
] as const;
