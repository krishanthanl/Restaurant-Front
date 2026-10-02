import { expect, it } from 'vitest';
import { tableTypes, type TableInput } from '../types/tableTypes';
import { validateTable } from './tableValidation';

const valid: TableInput = { areaId: 'a1', tableNumber: 'T1', name: '', capacity: 2, tableType: 0, displayOrder: 0, isActive: true };

it.each([0, -1, 1.5, NaN, Infinity, 2147483648])('rejects invalid capacity %s', capacity => {
 expect(validateTable({ ...valid, capacity }).capacity).toBe('Capacity must be a positive whole number.');
});

it.each([-1, tableTypes.length, 99, 0.5, NaN, Infinity])('rejects invalid table type %s', tableType => {
 expect(validateTable({ ...valid, tableType }).tableType).toBe('Select a valid table type.');
});

it.each(tableTypes.map((_, value) => value))('accepts supported table type %s', tableType => {
 expect(validateTable({ ...valid, capacity: 1, tableType })).toEqual({});
});
