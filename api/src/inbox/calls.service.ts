import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * AI phone-receptionist call log. Reads are real; the data is fed by the mock
 * feeder for now (real Twilio voice integration is deferred — see plan).
 */
@Injectable()
export class CallsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(tenantId: string) {
    const { data } = await this.supabase.admin
      .from('calls')
      .select('id, caller, number, duration_sec, intent, handled_by, transcript, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }
}
