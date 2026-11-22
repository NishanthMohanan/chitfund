import { type NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { toErrorBody } from '../common/filters/http-exception.filter';
import { type Env } from '../config/env';

export const API_PREFIX = 'api';
export const DOCS_PATH = 'api/docs';
const BODY_LIMIT = '100kb';
const HSTS_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** Serialises BigInt money values (paise) as decimal strings in every JSON response. */
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

/**
 * Applies transport and security middleware. Shared by main.ts and the e2e
 * tests so both run exactly the same stack.
 */
export function configureApp(app: NestExpressApplication, config: Env): void {
  app.setGlobalPrefix(API_PREFIX);
  app.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.set('json replacer', jsonReplacer);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      strictTransportSecurity: {
        maxAge: HSTS_MAX_AGE_SECONDS,
        includeSubDomains: true,
        preload: false,
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.enableCors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Accept', 'Content-Type', 'X-Requested-With'],
    maxAge: 600,
  });

  app.use(cookieParser());
  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: false });

  // Errors from Express middleware (body-parser) bypass Nest's exception filters.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const body = toErrorBody(error);
    res.status(body.statusCode).json(body);
  });
}
