import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type Provider =
  | 'facebook'
  | 'instagram'
  | 'google'
  | 'whatsapp'
  | 'twilio'
  | 'stripe'
  | 'gmail'
  | 'outlook'
  | 'calendly';

export interface ConnectedAccountInput {
  connected?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  externalAccountId?: string | null;
  externalAccountName?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Shared store for per-tenant OAuth connections (Meta, Google, email, etc.).
 * Tokens live in connected_accounts; column-level encryption at rest is a
 * Phase 2 follow-up (see plan) — do not expose this table via the Data API.
 */
@Injectable()
export class ConnectedAccountsService {
  constructor(private readonly supabase: SupabaseService) {}

  async upsert(tenantId: string, provider: Provider, input: ConnectedAccountInput) {
    const row: Record<string, unknown> = {
      tenant_id: tenantId,
      provider,
      connected: input.connected ?? true,
    };
    if (input.accessToken !== undefined) row.access_token = input.accessToken;
    if (input.refreshToken !== undefined) row.refresh_token = input.refreshToken;
    if (input.tokenExpiresAt !== undefined) row.token_expires_at = input.tokenExpiresAt;
    if (input.scopes !== undefined) row.scopes = input.scopes;
    if (input.externalAccountId !== undefined) row.external_account_id = input.externalAccountId;
    if (input.externalAccountName !== undefined) row.external_account_name = input.externalAccountName;
    if (input.metadata !== undefined) row.metadata = input.metadata;

    const { data, error } = await this.supabase.admin
      .from('connected_accounts')
      .upsert(row, { onConflict: 'tenant_id,provider' })
      .select('id, provider, connected, external_account_id, external_account_name')
      .single();
    if (error) throw error;
    return data;
  }

  async get(tenantId: string, provider: Provider) {
    const { data } = await this.supabase.admin
      .from('connected_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', provider)
      .maybeSingle();
    return data;
  }

  async list(tenantId: string) {
    const { data } = await this.supabase.admin
      .from('connected_accounts')
      .select('provider, connected, external_account_name, token_expires_at, connected_at')
      .eq('tenant_id', tenantId);
    return data ?? [];
  }

  async disconnect(tenantId: string, provider: Provider) {
    await this.supabase.admin
      .from('connected_accounts')
      .update({ connected: false, access_token: null, refresh_token: null })
      .eq('tenant_id', tenantId)
      .eq('provider', provider);
    return { disconnected: true };
  }
}
