import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { AdminContext } from '../common/types';

type Plan = 'decouverte' | 'performance' | 'premium';

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async listTenants(search?: string, status?: string) {
    let q = this.supabase.admin
      .from('tenants')
      .select('id, name, type, region, status, plan, mrr, health_score, created_at, last_active_at')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    return data ?? [];
  }

  async getTenant(id: string) {
    const db = this.supabase.admin;
    const { data: tenant } = await db.from('tenants').select('*').eq('id', id).maybeSingle();
    if (!tenant) throw new NotFoundException('Tenant not found');
    const [{ data: owner }, { data: subscription }, { data: invoices }, { data: usage }, { data: accounts }] =
      await Promise.all([
        db.from('owners').select('id, name, email, phone, email_verified').eq('tenant_id', id).maybeSingle(),
        db.from('subscriptions').select('*').eq('tenant_id', id).maybeSingle(),
        db.from('invoices').select('id, number, amount, status, issued_at, paid_at').eq('tenant_id', id).order('issued_at', { ascending: false }),
        db.from('usage_records').select('*').eq('tenant_id', id).order('period_start', { ascending: false }).limit(1).maybeSingle(),
        db.from('connected_accounts').select('provider, connected, external_account_name').eq('tenant_id', id),
      ]);
    return { tenant, owner, subscription, invoices: invoices ?? [], usage, connectedAccounts: accounts ?? [] };
  }

  async setStatus(
    id: string,
    status: 'active' | 'suspended',
    admin: AdminContext,
    ip?: string,
  ) {
    await this.supabase.admin.from('tenants').update({ status }).eq('id', id);
    await this.audit.record({
      actor: admin.email,
      actorAdminId: admin.adminId,
      action: status === 'suspended' ? 'suspend_tenant' : 'reactivate_tenant',
      target: id,
      ip,
    });
    return { id, status };
  }

  async changePlan(id: string, plan: Plan, admin: AdminContext, ip?: string) {
    await Promise.all([
      this.supabase.admin.from('tenants').update({ plan }).eq('id', id),
      this.supabase.admin.from('subscriptions').update({ plan }).eq('tenant_id', id),
    ]);
    await this.audit.record({
      actor: admin.email,
      actorAdminId: admin.adminId,
      action: 'change_plan',
      target: id,
      detail: `plan → ${plan}`,
      ip,
    });
    return { id, plan };
  }

  async refundInvoice(invoiceId: string, admin: AdminContext, ip?: string) {
    // TODO(phase-4): issue the actual Stripe refund via stripe.refunds.create.
    await this.supabase.admin
      .from('invoices')
      .update({ status: 'refunded' })
      .eq('id', invoiceId);
    await this.audit.record({
      actor: admin.email,
      actorAdminId: admin.adminId,
      action: 'refund_invoice',
      target: invoiceId,
      ip,
    });
    return { id: invoiceId, status: 'refunded' };
  }

  async listUsage() {
    const { data } = await this.supabase.admin
      .from('usage_records')
      .select('tenant_id, posts_used, posts_limit, calls_used, calls_limit, sms_used, sms_limit, ai_used, ai_limit, ai_cost, period_start, tenant:tenants(name, plan)')
      .order('ai_cost', { ascending: false });
    return data ?? [];
  }

  async listSupport(status?: string) {
    let q = this.supabase.admin
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data } = await q;
    return data ?? [];
  }

  async resolveTicket(id: string, admin: AdminContext, ip?: string) {
    await this.supabase.admin
      .from('support_tickets')
      .update({ status: 'resolved' })
      .eq('id', id);
    await this.audit.record({
      actor: admin.email,
      actorAdminId: admin.adminId,
      action: 'resolve_ticket',
      target: id,
      ip,
    });
    return { id, status: 'resolved' };
  }
}
