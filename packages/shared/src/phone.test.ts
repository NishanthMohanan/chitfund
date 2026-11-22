import { describe, expect, it } from 'vitest';
import { maskPhone, normalizeIndianPhone } from './phone';

describe('normalizeIndianPhone', () => {
  it.each([
    '9876543210',
    '09876543210',
    '919876543210',
    '+919876543210',
    '+91 98765 43210',
    '+91-98765-43210',
    '(987) 654-3210',
  ])('normalises %s', (input) => {
    expect(normalizeIndianPhone(input)).toBe('+919876543210');
  });

  it.each(['', '12345', '5876543210', '+1 9876543210', '98765432101', 'abcdefghij', '+9198765'])(
    'rejects %s',
    (input) => {
      expect(normalizeIndianPhone(input)).toBeNull();
    },
  );
});

describe('maskPhone', () => {
  it('keeps only the last four digits', () => {
    expect(maskPhone('+919876543210')).toBe('+91 ******3210');
  });

  it('handles numbers without the India prefix', () => {
    expect(maskPhone('12345678')).toBe('******5678');
  });
});
