import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from './email.service';

@Injectable()
export class InboxService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly email: EmailService,
  ) {}

  async listConversations(tenantId: string, channel?: string) {
    let q = this.supabase.admin
      .from('conversations')
      .select('id, channel, customer_id, customer_name, avatar_seed, unread, last_message, last_timestamp')
      .eq('tenant_id', tenantId)
      .order('last_timestamp', { ascending: false });
    if (channel) q = q.eq('channel', channel);
    const { data } = await q;
    return data ?? [];
  }

  async getConversation(tenantId: string, id: string) {
    const { data: conversation } = await this.supabase.admin
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!conversation) throw new NotFoundException('Conversation not found');

    const { data: messages } = await this.supabase.admin
      .from('messages')
      .select('id, author, text, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    // Mark read.
    await this.supabase.admin
      .from('conversations')
      .update({ unread: 0 })
      .eq('id', id);

    return { ...conversation, messages: messages ?? [] };
  }

  /** Reply as the business. For the email channel, actually sends via Gmail. */
  async reply(tenantId: string, id: string, text: string) {
    const { data: conversation } = await this.supabase.admin
      .from('conversations')
      .select('id, channel, customer_id, customer_name')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!conversation) throw new NotFoundException('Conversation not found');

    if (conversation.channel === 'email' && conversation.customer_id) {
      const { data: customer } = await this.supabase.admin
        .from('customers')
        .select('email')
        .eq('id', conversation.customer_id)
        .maybeSingle();
      if (customer?.email) {
        await this.email.sendGmail(
          tenantId,
          customer.email,
          `Re: your message`,
          text,
        );
      }
    }

    const now = new Date().toISOString();
    await this.supabase.admin.from('messages').insert({
      conversation_id: id,
      tenant_id: tenantId,
      author: 'business',
      text,
    });
    await this.supabase.admin
      .from('conversations')
      .update({ last_message: text, last_timestamp: now, unread: 0 })
      .eq('id', id);

    return { sent: true };
  }
}
