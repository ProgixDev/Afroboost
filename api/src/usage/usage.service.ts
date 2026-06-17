import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type UsageMetric = 'posts' | 'calls' | 'sms' | 'ai';

/** Per-tenant usage metering against plan limits, per calendar month. */
@Injectable()
export class UsageService {
  constructor(private readonly supabase: SupabaseService) {}

  private period(): { start: string; end: string } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }

  /** Ensure a usage row exists for the current period, seeded with plan limits. */
  async ensureRow(tenantId: string) {
    const { start, end } = this.period();
    const db = this.supabase.admin;
    const { data: existing } = await db
      .from('usage_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('period_start', start)
      .maybeSingle();
    if (existing) return existing;

    const { data: tenant } = await db
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();
    const { data: limits } = await db
      .from('plan_limits')
      .select('*')
      .eq('plan', tenant?.plan ?? 'decouverte')
      .maybeSingle();

    const { data } = await db
      .from('usage_records')
      .upsert(
        {
          tenant_id: tenantId,
          period_start: start,
          period_end: end,
          posts_limit: limits?.posts_limit ?? 0,
          calls_limit: limits?.calls_limit ?? 0,
          sms_limit: limits?.sms_limit ?? 0,
          ai_limit: limits?.ai_limit ?? 0,
        },
        { onConflict: 'tenant_id,period_start' },
      )
      .select('*')
      .single();
    return data;
  }

  async increment(tenantId: string, metric: UsageMetric, by = 1, aiCost = 0) {
    const row = await this.ensureRow(tenantId);
    const usedCol = `${metric}_used` as const;
    const patch: Record<string, unknown> = {
      [usedCol]: ((row?.[usedCol] as number) ?? 0) + by,
    };
    if (aiCost) patch.ai_cost = ((row?.ai_cost as number) ?? 0) + aiCost;
    await this.supabase.admin
      .from('usage_records')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('period_start', this.period().start);
  }

  /** Returns true if the tenant is still under its limit for `metric`. */
  async withinQuota(tenantId: string, metric: UsageMetric): Promise<boolean> {
    const row = await this.ensureRow(tenantId);
    const used = (row?.[`${metric}_used`] as number) ?? 0;
    const limit = (row?.[`${metric}_limit`] as number) ?? 0;
    return used < limit;
  }

  async getForTenant(tenantId: string) {
    return this.ensureRow(tenantId);
  }
}
