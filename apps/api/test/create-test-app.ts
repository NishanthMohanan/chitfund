import { type ModuleMetadata } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { APP_CONFIG } from '../src/config/config.module';
import { type Env } from '../src/config/env';

/** Boots the real application stack, optionally with extra test-only modules. */
export async function createTestApp(
  extra: Pick<ModuleMetadata, 'controllers'> = {},
): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: extra.controllers ?? [],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, app.get<Env>(APP_CONFIG));
  await app.init();
  return app;
}
