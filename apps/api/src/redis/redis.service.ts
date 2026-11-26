import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG } from '../config/config.module';
import { type Env } from '../config/env';

/** Redis is optional; `client` is null when REDIS_URL is not set. */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis | null;

  constructor(@Inject(APP_CONFIG) config: Env) {
    this.client = config.REDIS_URL
      ? new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 })
      : null;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
