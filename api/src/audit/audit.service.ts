import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type AuditAction =
  | 'login'
  | 'suspend_tenant'
  | 'reactivate_tenant'
  | 'edit_tenant'
  | 'refund_invoice'
  | 'impersonate'
  | 'change_plan'
  | 'invite_admin'
  | 'resolve_ticket'
  | 'export_data';

/** Writes operator actions to the immutable audit log. */
@Injectable()
export class AuditService {
  constructor(private readonly supabase: SupabaseService) {}

  async record(input: {
    actor: string;
    actorAdminId?: string;
    action: AuditAction;
    target?: string;
    detail?: string;
    ip?: string;
  }) {
    await this.supabase.admin.from('audit_logs').insert({
      actor: input.actor,
      actor_admin_id: input.actorAdminId ?? null,
      action: input.action,
      target: input.target ?? null,
      detail: input.detail ?? null,
      ip: input.ip ?? null,
    });
  }

  async list(limit = 100) {
    const { data } = await this.supabase.admin
      .from('audit_logs')
      .select('id, actor, action, target, detail, ip, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }
}
