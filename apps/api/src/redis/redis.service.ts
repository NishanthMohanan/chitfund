import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG } from '../config/config.module';
import { type Env } from '../config/env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(APP_CONFIG) config: Env) {
    this.client = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
