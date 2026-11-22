import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { ZodValidationPipe } from './common/validation/zod-validation.pipe';
import { APP_CONFIG, ConfigModule } from './config/config.module';
import { type Env } from './config/env';
import { buildLoggerParams } from './logging/logger.config';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: Env) => buildLoggerParams(config),
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
