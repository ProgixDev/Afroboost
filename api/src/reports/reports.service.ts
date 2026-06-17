import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAiService } from '../ai/openai.service';

/** Weekly AI decision reports (src/types DecisionReport). */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly openai: OpenAiService,
  ) {}

  async list(tenantId: string) {
    const { data } = await this.supabase.admin
      .from('decision_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('week_start', { ascending: false });
    return data ?? [];
  }

  /** Generate (or refresh) this week's report from recent activity. */
  async generateForTenant(tenantId: string) {
    const db = this.supabase.admin;
    const { start, end } = weekBounds();
    const sinceIso = `${start}T00:00:00Z`;

    const [{ count: posts }, { count: reviews }, { count: calls }, { data: tenant }] =
      await Promise.all([
        db.from('posts').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('status', 'published').gte('published_at', sinceIso),
        db.from('reviews').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).gte('created_at', sinceIso),
        db.from('calls').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).gte('created_at', sinceIso),
        db.from('tenants').select('name, languages').eq('id', tenantId).single(),
      ]);

    const facts = `Posts published: ${posts ?? 0}. New reviews: ${reviews ?? 0}. Calls handled: ${calls ?? 0}.`;
    let summary = facts;
    try {
      summary = await this.openai.complete(
        `You are a concise business analyst for "${tenant?.name ?? 'a local business'}". ` +
          `Summarize the week in 2 sentences in language "${tenant?.languages?.[0] ?? 'fr'}".`,
        facts,
      );
    } catch (err) {
      this.logger.warn(`Report summary failed: ${err instanceof Error ? err.message : err}`);
    }

    const { data } = await db
      .from('decision_reports')
      .upsert(
        {
          tenant_id: tenantId,
          week_start: start,
          week_end: end,
          trend: { summary, series: [posts ?? 0, reviews ?? 0, calls ?? 0] },
          wins: (posts ?? 0) > 0 ? [`${posts} posts published`] : [],
          issues: (reviews ?? 0) > 0 ? [`${reviews} reviews to address`] : [],
          actions: [],
        },
        { onConflict: 'tenant_id,week_start' },
      )
      .select('*')
      .single();
    return data;
  }

  /** Weekly cron target — generate for every active tenant. */
  async generateForAll() {
    const { data: tenants } = await this.supabase.admin
      .from('tenants')
      .select('id')
      .eq('status', 'active');
    let n = 0;
    for (const t of tenants ?? []) {
      try {
        await this.generateForTenant(t.id);
        n += 1;
      } catch (err) {
        this.logger.error(`Report failed for tenant ${t.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
    return { generated: n };
  }
}

function weekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay() || 7; // Mon=1..Sun=7
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}
