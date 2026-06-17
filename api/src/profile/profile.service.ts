import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto';

/**
 * Owner-facing business settings: tenant-level fields (name, type, tone,
 * languages) + the richer business_profile (hours, services), and a read of
 * connected accounts assembled into the frontend's Record<Provider, boolean>.
 */
@Injectable()
export class ProfileService {
  constructor(private readonly supabase: SupabaseService) {}

  async get(tenantId: string) {
    const db = this.supabase.admin;
    const [{ data: tenant }, { data: profile }, { data: accounts }] =
      await Promise.all([
        db
          .from('tenants')
          .select('id, name, type, address, tone, languages, plan, status, trial_ends_at')
          .eq('id', tenantId)
          .single(),
        db
          .from('business_profiles')
          .select('hours, services')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        db
          .from('connected_accounts')
          .select('provider, connected')
          .eq('tenant_id', tenantId),
      ]);

    const connectedAccounts: Record<string, boolean> = {};
    for (const a of accounts ?? []) connectedAccounts[a.provider] = a.connected;

    return {
      ...tenant,
      hours: profile?.hours ?? {},
      services: profile?.services ?? [],
      connectedAccounts,
    };
  }

  async update(tenantId: string, dto: UpdateProfileDto) {
    const db = this.supabase.admin;

    const tenantPatch: Record<string, unknown> = {};
    if (dto.name !== undefined) tenantPatch.name = dto.name;
    if (dto.type !== undefined) tenantPatch.type = dto.type;
    if (dto.address !== undefined) tenantPatch.address = dto.address;
    if (dto.tone !== undefined) tenantPatch.tone = dto.tone;
    if (dto.languages !== undefined) tenantPatch.languages = dto.languages;
    if (Object.keys(tenantPatch).length > 0) {
      await db.from('tenants').update(tenantPatch).eq('id', tenantId);
    }

    const profilePatch: Record<string, unknown> = { tenant_id: tenantId };
    if (dto.hours !== undefined) profilePatch.hours = dto.hours;
    if (dto.services !== undefined) profilePatch.services = dto.services;
    if (Object.keys(profilePatch).length > 1) {
      await db
        .from('business_profiles')
        .upsert(profilePatch, { onConflict: 'tenant_id' });
    }

    return this.get(tenantId);
  }
}
