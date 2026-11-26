import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'cf_session';

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Only the hash is stored, so a database leak does not expose live sessions. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
