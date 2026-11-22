import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { type NextFunction, type Request, type Response } from 'express';
import { DOCS_PATH } from './configure-app';

/** API reference for local development. Never mounted in production. */
export function mountSwagger(app: NestExpressApplication): void {
  // Swagger UI needs to load its own scripts and styles, unlike JSON routes.
  app.use(`/${DOCS_PATH}`, (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
    );
    next();
  });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('ChitFund API').setVersion('0.1.0').build(),
  );
  SwaggerModule.setup(DOCS_PATH, app, document);
}
