import { describe, expect, it } from 'vitest';
import { validSessionInput } from './diningSessionValidation';
describe('dining session input', () => {
  it('requires a whole guest count within capacity', () => {
    expect(validSessionInput('1', 4, '')).toBe(true);
    for (const value of ['', '0', '-1', '5', '1.5', 'NaN']) expect(validSessionInput(value, 4, '')).toBe(false);
  });
  it('limits notes', () => {
    expect(validSessionInput('2', 4, 'x'.repeat(1000))).toBe(true);
    expect(validSessionInput('2', 4, 'x'.repeat(1001))).toBe(false);
  });
});
