import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Provides the service-role Supabase client. The backend is the trusted
 * gateway: it talks to Postgres with the service-role key (which bypasses
 * RLS), and enforces tenant scoping in the app layer.
 *
 * The client is created lazily on first use so the app boots with zero
 * config — only routes that actually touch the database require the
 * SUPABASE_* env vars.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client?: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  /** Service-role client. Bypasses RLS — never expose to untrusted callers. */
  get admin(): SupabaseClient {
    if (!this.client) {
      const url = this.config.get<string>('SUPABASE_URL');
      const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) {
        throw new Error(
          'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.',
        );
      }
      this.client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      this.logger.log('Supabase service-role client initialised');
    }
    return this.client;
  }

  /** Whether the Supabase env is present (used by readiness checks). */
  get configured(): boolean {
    return Boolean(
      this.config.get<string>('SUPABASE_URL') &&
        this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }
}
