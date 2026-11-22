/**
 * Money is always held as integer paise in a bigint. Rupee amounts never pass
 * through floating point; user input is parsed from its decimal string form.
 */
export type Paise = bigint;

export const PAISE_PER_RUPEE = 100n;

const RUPEE_INPUT_PATTERN = /^(\d{1,3}(,\d{2,3})*|\d+)(\.\d{1,2})?$/;
const PAISE_STRING_PATTERN = /^-?\d+$/;

const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export class MoneyError extends Error {
  override readonly name = 'MoneyError';
}

/**
 * Parses a non-negative rupee amount typed by a person, e.g. "1,00,000" or
 * "8500.50", into paise. Returns null when the input is not a valid amount.
 */
export function parseRupeesToPaise(input: string): Paise | null {
  const trimmed = input.trim();
  if (!RUPEE_INPUT_PATTERN.test(trimmed)) {
    return null;
  }

  const [whole = '', fraction = ''] = trimmed.replaceAll(',', '').split('.');
  return BigInt(whole) * PAISE_PER_RUPEE + BigInt(fraction.padEnd(2, '0'));
}

export type FormatInrOptions = {
  /** "auto" omits ".00" for whole-rupee amounts; "always" keeps two decimals. */
  fraction?: 'auto' | 'always';
};

/** Formats paise as Indian rupees with lakh/crore grouping, e.g. ₹1,00,000. */
export function formatINR(paise: Paise, options: FormatInrOptions = {}): string {
  const negative = paise < 0n;
  const magnitude = negative ? -paise : paise;
  const rupees = magnitude / PAISE_PER_RUPEE;
  const remainder = magnitude % PAISE_PER_RUPEE;

  const whole = rupeeFormatter.format(rupees);
  const showFraction = remainder !== 0n || options.fraction === 'always';
  const formatted = showFraction ? `${whole}.${remainder.toString().padStart(2, '0')}` : whole;

  return negative ? `-${formatted}` : formatted;
}

export function sumPaise(values: readonly Paise[]): Paise {
  return values.reduce((total, value) => total + value, 0n);
}

export function subtractPaise(minuend: Paise, subtrahend: Paise): Paise {
  return minuend - subtrahend;
}

export function multiplyPaise(amount: Paise, factor: number): Paise {
  if (!Number.isSafeInteger(factor)) {
    throw new MoneyError('Money can only be multiplied by a whole number');
  }
  return amount * BigInt(factor);
}

/**
 * Splits a total into `parts` amounts that differ by at most one paisa and add
 * back up to the total exactly. Earlier parts receive the extra paise.
 */
export function splitPaise(total: Paise, parts: number): Paise[] {
  if (!Number.isSafeInteger(parts) || parts <= 0) {
    throw new MoneyError('Money can only be split into a positive whole number of parts');
  }
  if (total < 0n) {
    throw new MoneyError('Only non-negative amounts can be split');
  }

  const count = BigInt(parts);
  const base = total / count;
  const extra = Number(total % count);

  return Array.from({ length: parts }, (_, index) => (index < extra ? base + 1n : base));
}

/** Serialises paise for JSON transport, where bigint is not supported. */
export function paiseToString(paise: Paise): string {
  return paise.toString();
}

export function paiseFromString(value: string): Paise {
  if (!PAISE_STRING_PATTERN.test(value)) {
    throw new MoneyError('Invalid paise value');
  }
  return BigInt(value);
}
