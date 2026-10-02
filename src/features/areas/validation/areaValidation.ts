import type { AreaInput } from '../types/areaTypes';

export type AreaFieldErrors = Partial<Record<keyof AreaInput, string>>;

export function validateArea(input: AreaInput): AreaFieldErrors {
  const errors: AreaFieldErrors = {};
  if (!input.name.trim()) errors.name = 'Area name is required.';
  else if (input.name.trim().length > 100) errors.name = 'Use 100 characters or fewer.';
  if (input.description.trim().length > 500) errors.description = 'Use 500 characters or fewer.';
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 2147483647)
    errors.displayOrder = 'Display order must be a whole number from 0 to 2,147,483,647.';
  return errors;
}
