import { describe, expect, it } from 'vitest';
import { validateKitchen } from './kitchenValidation';

const valid = { name: 'Hot Kitchen', code: 'HOT', description: '', displayOrder: 0, isActive: true };

describe('validateKitchen', () => {
  it('accepts valid input', () => expect(validateKitchen(valid)).toEqual({}));

  it('requires a name within limits', () => {
    expect(validateKitchen({ ...valid, name: '  ' }).name).toBe('Kitchen name is required.');
    expect(validateKitchen({ ...valid, name: 'a'.repeat(101) }).name).toBe('Use 100 characters or fewer.');
  });

  it('requires a short code of letters, digits, - and _', () => {
    expect(validateKitchen({ ...valid, code: ' ' }).code).toBe('Kitchen code is required.');
    expect(validateKitchen({ ...valid, code: 'A'.repeat(21) }).code).toBe('Use 20 characters or fewer.');
    expect(validateKitchen({ ...valid, code: 'HOT KITCHEN' }).code).toBe('Use only letters, digits, - and _.');
    expect(validateKitchen({ ...valid, code: 'hot_1-a' }).code).toBeUndefined();
  });

  it('limits description and display order', () => {
    expect(validateKitchen({ ...valid, description: 'a'.repeat(501) }).description).toBe('Use 500 characters or fewer.');
    expect(validateKitchen({ ...valid, displayOrder: -1 }).displayOrder).toMatch(/whole number/);
    expect(validateKitchen({ ...valid, displayOrder: 1.5 }).displayOrder).toMatch(/whole number/);
  });
});
