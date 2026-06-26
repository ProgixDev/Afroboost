import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Central BullMQ configuration. Registering the root here does NOT open a
 * Redis connection — connections are established only when a queue or worker
 * is actually created (Phase 3+), so the app still boots without Redis.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          // Railway's private network is IPv6-only; ioredis defaults to an
          // IPv4 DNS lookup. family: 0 enables dual-stack resolution so the
          // same config works locally (IPv4) and on Railway (IPv6).
          family: 0,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: { age: 604800 },
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
