import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseEnv } from './env';

// Test fixtures only. Real values live in .env.
const valid = {
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVEL: 'info',
  WEB_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://app:secret-value@localhost:5432/chitfund',
  REDIS_URL: 'redis://127.0.0.1:6379',
  SESSION_IDLE_HOURS: '72',
  TRUST_PROXY_HOPS: '0',
  SUPERADMIN_SEED_ON_START: 'false',
};

describe('parseEnv', () => {
  it('parses a complete environment', () => {
    expect(parseEnv(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      SESSION_IDLE_HOURS: 72,
      TRUST_PROXY_HOPS: 0,
      SUPERADMIN_SEED_ON_START: false,
    });
  });

  it('has no built-in defaults', () => {
    for (const key of [
      'NODE_ENV',
      'PORT',
      'LOG_LEVEL',
      'SESSION_IDLE_HOURS',
      'TRUST_PROXY_HOPS',
      'SUPERADMIN_SEED_ON_START',
    ] as const) {
      const { [key]: _omitted, ...rest } = valid;
      expect(() => parseEnv(rest)).toThrow(new RegExp(key));
    }
  });

  it('coerces numeric values', () => {
    expect(parseEnv({ ...valid, PORT: '8080', TRUST_PROXY_HOPS: '1' })).toMatchObject({
      PORT: 8080,
      TRUST_PROXY_HOPS: 1,
    });
  });

  it('splits WEB_ORIGIN into a list of origins', () => {
    expect(
      parseEnv({ ...valid, WEB_ORIGIN: 'http://localhost:5173, http://127.0.0.1:5173' }).WEB_ORIGIN,
    ).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173']);
    expect(() => parseEnv({ ...valid, WEB_ORIGIN: 'http://localhost:5173,not-a-url' })).toThrow(
      /WEB_ORIGIN/,
    );
  });

  it('fails fast on missing variables', () => {
    expect(() => parseEnv({})).toThrow(EnvValidationError);
  });

  it('rejects non-PostgreSQL and non-Redis URLs', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
    expect(() => parseEnv({ ...valid, REDIS_URL: 'http://localhost' })).toThrow(/REDIS_URL/);
  });

  it('never includes values in the error message', () => {
    try {
      parseEnv({ ...valid, DATABASE_URL: 'mysql://user:hunter2@localhost/db' });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain('hunter2');
    }
  });
});
