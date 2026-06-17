import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Dedicated worker process for BullMQ queues (generation, publish, reports).
 * Run with `npm run worker` after `npm run build`. It boots the same modules
 * as the API (so all @Processor providers attach their workers) but does not
 * listen for HTTP.
 *
 * Note: in dev the API process also runs the processors. For production, run
 * the API with processors disabled and scale workers separately.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  Logger.log('AfroBoost worker started — BullMQ processors active', 'Worker');
}

void bootstrap();
