const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const SEPARATORS = /[\s\-().]/g;

/**
 * Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX). Accepts the
 * forms people actually type: 9876543210, 09876543210, 919876543210 and
 * +91 98765 43210. Returns null for anything that is not an Indian mobile.
 */
export function normalizeIndianPhone(input: string): string | null {
  const compact = input.replace(SEPARATORS, '');

  let national: string;
  if (compact.startsWith('+91')) {
    national = compact.slice(3);
  } else if (compact.length === 12 && compact.startsWith('91')) {
    national = compact.slice(2);
  } else if (compact.length === 11 && compact.startsWith('0')) {
    national = compact.slice(1);
  } else {
    national = compact;
  }

  return INDIAN_MOBILE.test(national) ? `+91${national}` : null;
}

/** Masks all but the last four digits, for logs and partial display. */
export function maskPhone(e164: string): string {
  const visible = e164.slice(-4);
  return `${e164.startsWith('+91') ? '+91 ' : ''}******${visible}`;
}
