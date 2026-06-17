import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(tenantId: string) {
    const { data } = await this.supabase.admin
      .from('notifications')
      .select('id, title, body, kind, read, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);
    return data ?? [];
  }

  async markRead(tenantId: string, id: string) {
    await this.supabase.admin
      .from('notifications')
      .update({ read: true })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    return { read: true };
  }

  async markAllRead(tenantId: string) {
    await this.supabase.admin
      .from('notifications')
      .update({ read: true })
      .eq('tenant_id', tenantId)
      .eq('read', false);
    return { read: true };
  }

  /** Emit a notification (called by other services on key events). */
  async push(tenantId: string, input: { title: string; body?: string; kind: string }) {
    await this.supabase.admin.from('notifications').insert({
      tenant_id: tenantId,
      title: input.title,
      body: input.body ?? null,
      kind: input.kind,
    });
  }
}
