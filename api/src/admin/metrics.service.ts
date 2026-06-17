import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type Plan = 'decouverte' | 'performance' | 'premium';
const PLAN_LABELS: Record<Plan, string> = {
  decouverte: 'Découverte',
  performance: 'Performance',
  premium: 'Premium',
};

/**
 * Platform KPIs for the admin overview — backend port of
 * admin/src/lib/metrics.ts, computed from real subscriptions/invoices/usage.
 */
@Injectable()
export class MetricsService {
  constructor(private readonly supabase: SupabaseService) {}

  async overview() {
    const db = this.supabase.admin;
    const [{ data: subs }, { data: tenants }, { data: invoices }, { data: usage }, { data: financials }] =
      await Promise.all([
        db.from('subscriptions').select('status, mrr, plan'),
        db.from('tenants').select('status, plan'),
        db.from('invoices').select('status, amount'),
        db.from('usage_records').select('ai_cost'),
        db.from('financial_months').select('*').order('month_iso', { ascending: true }),
      ]);

    const subscriptions = subs ?? [];
    const totalMrr = subscriptions
      .filter((s) => s.status === 'active' || s.status === 'past_due')
      .reduce((sum, s) => sum + Number(s.mrr ?? 0), 0);

    const t = tenants ?? [];
    const tenantCounts = {
      total: t.length,
      active: t.filter((x) => x.status === 'active').length,
      trialing: t.filter((x) => x.status === 'trialing').length,
      pastDue: t.filter((x) => x.status === 'past_due').length,
      suspended: t.filter((x) => x.status === 'suspended').length,
      canceled: t.filter((x) => x.status === 'canceled').length,
    };

    const planMap: Record<Plan, number> = { decouverte: 0, performance: 0, premium: 0 };
    for (const x of t) if (x.status !== 'canceled') planMap[x.plan as Plan]++;
    const planDistribution = (Object.keys(planMap) as Plan[]).map((p) => ({
      plan: p,
      label: PLAN_LABELS[p],
      count: planMap[p],
    }));

    const fin = financials ?? [];
    const ytdIncome = fin.reduce((s, m) => s + Number(m.income ?? 0), 0);
    const ytdCost = fin.reduce(
      (s, m) => s + Number(m.ai_cost ?? 0) + Number(m.infra_cost ?? 0) + Number(m.other_cost ?? 0),
      0,
    );
    const ytdProfit = ytdIncome - ytdCost;
    const financialSeries = fin.map((m) => {
      const cost = Number(m.ai_cost ?? 0) + Number(m.infra_cost ?? 0) + Number(m.other_cost ?? 0);
      const profit = Number(m.income ?? 0) - cost;
      return {
        ...m,
        cost,
        profit,
        margin: m.income ? Math.round((profit / Number(m.income)) * 100) : 0,
      };
    });
    const mrrGrowthPct =
      fin.length >= 2 && Number(fin[fin.length - 2].income)
        ? ((Number(fin[fin.length - 1].income) - Number(fin[fin.length - 2].income)) /
            Number(fin[fin.length - 2].income)) *
          100
        : 0;

    const inv = invoices ?? [];
    return {
      totalMrr,
      arr: totalMrr * 12,
      tenantCounts,
      planDistribution,
      aiSpend: Math.round((usage ?? []).reduce((s, u) => s + Number(u.ai_cost ?? 0), 0) * 100) / 100,
      ytdIncome,
      ytdCost,
      ytdProfit,
      ytdMargin: ytdIncome === 0 ? 0 : (ytdProfit / ytdIncome) * 100,
      mrrGrowthPct,
      financialSeries,
      overdueInvoices: inv.filter((i) => i.status === 'failed' || i.status === 'open').length,
      paidRevenueAllTime: inv
        .filter((i) => i.status === 'paid')
        .reduce((s, i) => s + Number(i.amount ?? 0), 0),
    };
  }
}
