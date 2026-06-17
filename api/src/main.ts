import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Fastify uses pino under the hood for request logging.
    new FastifyAdapter({ trustProxy: true, logger: true }),
    // rawBody lets the Stripe/Meta webhook controllers verify signatures.
    { rawBody: true },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // All routes are prefixed with /api, except health checks (kept at root
  // so load balancers / uptime probes can hit /health directly).
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });

  await app.register(helmet);
  app.enableCors();
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3333);
  await app.listen({ port, host: '0.0.0.0' });

  Logger.log(`AfroBoost API listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Health: http://localhost:${port}/health`, 'Bootstrap');
}

void bootstrap();
