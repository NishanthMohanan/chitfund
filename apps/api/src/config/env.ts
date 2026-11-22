import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  /** Comma-separated origins allowed by CORS, e.g. http://localhost:5173,http://127.0.0.1:5173. */
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
  REDIS_URL: z
    .string()
    .url()
    .refine((value) => /^rediss?:\/\//.test(value), 'Must be a Redis URL'),
  /** Number of reverse proxies in front of the API, used to resolve the client IP. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
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
