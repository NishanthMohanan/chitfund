import { describe, expect, it } from 'vitest';
import {
  MoneyError,
  dividePaiseExactly,
  formatINR,
  multiplyPaise,
  paiseFromString,
  paiseToString,
  parseRupeesToPaise,
  splitPaise,
  subtractPaise,
  sumPaise,
} from './money';

describe('parseRupeesToPaise', () => {
  it.each([
    ['0', 0n],
    ['8500', 850_000n],
    ['8500.5', 850_050n],
    ['8500.05', 850_005n],
    ['1,00,000', 10_000_000n],
    ['1,00,000.75', 10_000_075n],
    ['100,000', 10_000_000n],
    ['  250  ', 25_000n],
  ])('parses %s', (input, expected) => {
    expect(parseRupeesToPaise(input)).toBe(expected);
  });

  it.each(['', 'abc', '-100', '10.123', '1e5', '1,0', '.50', '10.', '₹100'])(
    'rejects %s',
    (input) => {
      expect(parseRupeesToPaise(input)).toBeNull();
    },
  );
});

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(10_000_000n)).toBe('₹1,00,000');
    expect(formatINR(1_000_000_000n)).toBe('₹1,00,00,000');
  });

  it('omits paise for whole rupees by default', () => {
    expect(formatINR(850_000n)).toBe('₹8,500');
  });

  it('shows paise when present', () => {
    expect(formatINR(850_005n)).toBe('₹8,500.05');
  });

  it('always shows paise when requested', () => {
    expect(formatINR(850_000n, { fraction: 'always' })).toBe('₹8,500.00');
  });

  it('formats zero and negative amounts', () => {
    expect(formatINR(0n)).toBe('₹0');
    expect(formatINR(-12_550n)).toBe('-₹125.50');
  });
});

describe('arithmetic', () => {
  it('sums a list of amounts', () => {
    expect(sumPaise([100n, 250n, 5n])).toBe(355n);
    expect(sumPaise([])).toBe(0n);
  });

  it('subtracts amounts', () => {
    expect(subtractPaise(1_000n, 250n)).toBe(750n);
  });

  it('multiplies by a whole number', () => {
    expect(multiplyPaise(850_000n, 20)).toBe(17_000_000n);
  });

  it('refuses fractional or unsafe multipliers', () => {
    expect(() => multiplyPaise(100n, 1.5)).toThrow(MoneyError);
    expect(() => multiplyPaise(100n, Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyError);
  });
});

describe('splitPaise', () => {
  it('splits evenly when possible', () => {
    expect(splitPaise(900n, 3)).toEqual([300n, 300n, 300n]);
  });

  it('gives remaining paise to the earliest parts', () => {
    const parts = splitPaise(1_001n, 3);
    expect(parts).toEqual([334n, 334n, 333n]);
    expect(sumPaise(parts)).toBe(1_001n);
  });

  it('rejects invalid part counts', () => {
    expect(() => splitPaise(100n, 0)).toThrow(MoneyError);
    expect(() => splitPaise(100n, 2.5)).toThrow(MoneyError);
  });

  it('rejects negative totals', () => {
    expect(() => splitPaise(-1n, 2)).toThrow(MoneyError);
  });
});

describe('dividePaiseExactly', () => {
  it('divides when the total splits into whole paise', () => {
    expect(dividePaiseExactly(5_000_000n, 20)).toBe(250_000n);
  });

  it('returns null when the total does not split evenly', () => {
    expect(dividePaiseExactly(1_000n, 3)).toBeNull();
  });

  it.each([0, -2, 1.5])('rejects %s parts', (parts) => {
    expect(() => dividePaiseExactly(100n, parts)).toThrow(MoneyError);
  });
});

describe('transport', () => {
  it('round-trips through strings', () => {
    expect(paiseFromString(paiseToString(12_345_678_901n))).toBe(12_345_678_901n);
    expect(paiseFromString('-50')).toBe(-50n);
  });

  it.each(['', '1.5', 'abc', '1e3'])('rejects %s', (value) => {
    expect(() => paiseFromString(value)).toThrow(MoneyError);
  });
});
