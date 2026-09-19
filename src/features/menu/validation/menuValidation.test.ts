import { describe, expect, it } from 'vitest';
import { validateCategory, validateMenuItem } from './menuValidation';

describe('menu validation', () => {
  it('rejects an invalid category', () => {
    const errors = validateCategory({ name: ' ', description: '', imagePath: '', displayOrder: -1 });
    expect(errors.name).toBeTruthy();
    expect(errors.displayOrder).toBeTruthy();
  });

  it('rejects an unsafe category image path', () => {
    const errors = validateCategory({ name: 'Mains', description: '', imagePath: '/images/%2e%2e/secret', displayOrder: 1 });
    expect(errors.imagePath).toBeTruthy();
  });

  it('accepts a valid menu item', () => {
    const errors = validateMenuItem({ name: 'Chicken Rice', description: '', price: '1250.50', categoryId: 'category-id', imagePath: '/images/chicken.webp', isAvailable: true });
    expect(errors).toEqual({});
  });

  it('rejects excessive decimal places and encoded traversal', () => {
    const errors = validateMenuItem({ name: 'Tea', description: '', price: '2.999', categoryId: 'category-id', imagePath: '/images/%2e%2e/secret.webp', isAvailable: true });
    expect(errors.price).toBeTruthy();
    expect(errors.imagePath).toBeTruthy();
  });
});
