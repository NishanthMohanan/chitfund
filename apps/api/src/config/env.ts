import { z } from 'zod';

/**
 * Every setting comes from the environment (.env locally). There are no
 * built-in defaults: a missing variable stops the API at boot.
 */

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  /** Comma-separated origins allowed by CORS. */
  WEB_ORIGIN: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().url()).min(1)),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => /^postgres(ql)?:\/\//.test(value), 'Must be a PostgreSQL URL'),
  /** Optional. Without it the API runs as a single local process. */
  REDIS_URL: z
    .string()
    .url()
    .refine((value) => /^rediss?:\/\//.test(value), 'Must be a Redis URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /** Hours a sign-in stays valid without activity. */
  SESSION_IDLE_HOURS: z.coerce.number().int().min(1).max(720),
  /** Number of reverse proxies in front of the API, used to resolve the client IP. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5),
  /**
   * When true, the API creates or replaces the superadmin from the SUPERADMIN_*
   * variables at startup. When false, the stored superadmin is left untouched.
   */
  SUPERADMIN_SEED_ON_START: z.enum(['true', 'false']).transform((value) => value === 'true'),
  SUPERADMIN_PHONE: z.string().optional(),
  SUPERADMIN_PASSWORD: z.string().optional(),
  SUPERADMIN_NAME: z.string().optional(),
  SUPERADMIN_EMAIL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError';
}

/**
 * Validates the environment at boot. Error messages name the offending
 * variables but never echo their values, which may be secrets.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new EnvValidationError(`Invalid environment configuration. ${problems}`);
  }
  return result.data;
}
