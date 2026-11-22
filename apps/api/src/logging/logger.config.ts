import { RequestMethod } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type IncomingMessage } from 'node:http';
import { type Params } from 'nestjs-pino';
import { type Env } from '../config/env';

/**
 * Personal data and credentials are removed from every log line. Paths cover
 * request bodies, nested objects up to two levels and HTTP headers.
 */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  ...['password', 'currentPassword', 'newPassword', 'passwordHash', 'totpSecret', 'token'].flatMap(
    (key) => [key, `*.${key}`, `*.*.${key}`],
  ),
  ...['phone', 'email'].flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
];

export function buildLoggerParams(config: Env): Params {
  return {
    // Nest 11 route syntax; the library default ('*') triggers a legacy-path warning.
    forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
    pinoHttp: {
      level: config.LOG_LEVEL,
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
      genReqId: (req: IncomingMessage) => {
        const header = req.headers['x-request-id'];
        return typeof header === 'string' && /^[\w-]{8,64}$/.test(header) ? header : randomUUID();
      },
      autoLogging: { ignore: (req: IncomingMessage) => req.url === '/api/health' },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url?.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      ...(config.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
        : {}),
    },
  };
}
