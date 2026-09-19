import type { CategoryInput, MenuItemInput } from '../types/menuTypes';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function validateCategory(input: CategoryInput): FieldErrors<CategoryInput> {
  const errors: FieldErrors<CategoryInput> = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Category name is required.';
  else if (name.length > 100) errors.name = 'Use 100 characters or fewer.';
  if (input.description.trim().length > 500) errors.description = 'Use 500 characters or fewer.';
  if (input.imagePath.length > 2048) errors.imagePath = 'Use 2,048 characters or fewer.';
  else if (input.imagePath && !isValidImagePath(input.imagePath)) errors.imagePath = 'Use an HTTPS URL or safe path beginning with /.';
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) errors.displayOrder = 'Display order must be a whole number of 0 or more.';
  return errors;
}

export function validateMenuItem(input: MenuItemInput): FieldErrors<MenuItemInput> {
  const errors: FieldErrors<MenuItemInput> = {};
  const name = input.name.trim();
  const price = Number(input.price);
  if (!name) errors.name = 'Item name is required.';
  else if (name.length > 150) errors.name = 'Use 150 characters or fewer.';
  if (input.description.trim().length > 1000) errors.description = 'Use 1,000 characters or fewer.';
  if (!input.categoryId) errors.categoryId = 'Choose a category.';
  if (input.price.trim() === '' || !Number.isFinite(price) || price < 0) errors.price = 'Enter a valid non-negative price.';
  else if (!/^\d+(\.\d{1,2})?$/.test(input.price.trim())) errors.price = 'Price can have at most two decimal places.';
  if (input.imagePath.length > 2048) errors.imagePath = 'Use 2,048 characters or fewer.';
  else if (input.imagePath && !isValidImagePath(input.imagePath)) errors.imagePath = 'Use an HTTPS URL or safe path beginning with /.';
  return errors;
}

function isValidImagePath(value: string) {
  if (value.startsWith('https://')) return true;
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return false; }
  return decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('..') && !decoded.includes('\\') && !decoded.includes('?') && !decoded.includes('#');
}
