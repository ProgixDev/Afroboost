import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  /** Liveness — always 200 if the process is up. */
  @Get()
  liveness() {
    return {
      status: 'ok',
      service: 'afroboost-api',
      env: this.config.get<string>('NODE_ENV', 'development'),
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness — reports which integrations are configured. */
  @Get('ready')
  readiness() {
    return {
      status: 'ok',
      supabase: this.supabase.configured ? 'configured' : 'unconfigured',
      timestamp: new Date().toISOString(),
    };
  }
}
