import type { TableInput } from '../types/tableTypes';
export type TableFieldErrors = Partial<Record<keyof TableInput, string>>;
export function validateTable(input: TableInput): TableFieldErrors {
 const errors: TableFieldErrors = {};
 if (!input.areaId) errors.areaId = 'Select an active area.';
 if (!input.tableNumber.trim() || input.tableNumber.trim().length > 50) errors.tableNumber = 'Table number is required and cannot exceed 50 characters.';
 if (input.name.trim().length > 100) errors.name = 'Name cannot exceed 100 characters.';
 if (!Number.isInteger(input.capacity) || input.capacity <= 0 || input.capacity > 2147483647) errors.capacity = 'Capacity must be a positive whole number.';
 if (!Number.isInteger(input.tableType) || input.tableType < 0 || input.tableType > 3) errors.tableType = 'Select a valid table type.';
 if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 2147483647) errors.displayOrder = 'Display order must be a non-negative whole number.';
 return errors;
}
