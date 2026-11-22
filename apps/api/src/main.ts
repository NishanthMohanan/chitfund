import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { mountSwagger } from './bootstrap/swagger';
import { APP_CONFIG } from './config/config.module';
import { type Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get<Env>(APP_CONFIG);
  configureApp(app, config);

  if (config.NODE_ENV !== 'production') {
    mountSwagger(app);
  }

  app.enableShutdownHooks();
  await app.listen(config.PORT);
}

void bootstrap();
