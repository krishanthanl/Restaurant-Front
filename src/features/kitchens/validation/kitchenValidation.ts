import type { KitchenInput } from '../types/kitchenTypes';

export type KitchenFieldErrors = Partial<Record<keyof KitchenInput, string>>;

export function validateKitchen(input: KitchenInput): KitchenFieldErrors {
  const errors: KitchenFieldErrors = {};
  if (!input.name.trim()) errors.name = 'Kitchen name is required.';
  else if (input.name.trim().length > 100) errors.name = 'Use 100 characters or fewer.';
  const code = input.code.trim();
  if (!code) errors.code = 'Kitchen code is required.';
  else if (code.length > 20) errors.code = 'Use 20 characters or fewer.';
  else if (!/^[A-Za-z0-9_-]+$/.test(code)) errors.code = 'Use only letters, digits, - and _.';
  if (input.description.trim().length > 500) errors.description = 'Use 500 characters or fewer.';
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 2147483647)
    errors.displayOrder = 'Display order must be a whole number from 0 to 2,147,483,647.';
  return errors;
}
