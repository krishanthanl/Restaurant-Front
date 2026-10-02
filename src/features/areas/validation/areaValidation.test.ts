import { describe, expect, it } from 'vitest';
import { validateArea } from './areaValidation';

const valid = { name: 'Hall', description: '', displayOrder: 0, isActive: true };

describe('Area validation', () => {
  it('accepts valid area details', () => expect(validateArea(valid)).toEqual({}));
  it('rejects blank and long names', () => {
    expect(validateArea({ ...valid, name: ' ' }).name).toBeDefined();
    expect(validateArea({ ...valid, name: 'a'.repeat(101) }).name).toBeDefined();
  });
  it('rejects long descriptions', () => expect(validateArea({ ...valid, description: 'a'.repeat(501) }).description).toBeDefined());
  it.each([-1, 1.5, NaN, Infinity, 2147483648])('rejects invalid display order %s', (displayOrder) =>
    expect(validateArea({ ...valid, displayOrder }).displayOrder).toBeDefined());
});
