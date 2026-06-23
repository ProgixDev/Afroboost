import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConnectedAccountsService } from '../integrations/connected-accounts.service';
import { MetaService } from './meta.service';

type MessagingChannel = 'facebook' | 'instagram';

/** A single messaging event extracted from a webhook entry. */
interface InboundMessage {
  channel: MessagingChannel;
  recipientId: string; // our page id (FB) or IG account id
  senderId: string; // the customer's PSID (FB) or IGSID (IG)
  messageId: string;
  text: string;
  timestamp: Date;
}

/**
 * Facebook Messenger + Instagram Direct messaging.
 *
 * Inbound: webhook events are verified, parsed, mapped to the owning tenant via
 * the recipient (page/IG) id, and written into the same conversations/messages
 * tables the inbox already reads. Outbound: see sendFacebook/sendInstagram.
 */
@Injectable()
export class MetaMessagingService {
  private readonly logger = new Logger(MetaMessagingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly meta: MetaService,
    private readonly accounts: ConnectedAccountsService,
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Outbound ─────────────────────────────────────────────────────────────

  // Meta's standard messaging window: replies are free-form within 24h of the
  // customer's last message; outside it, a message tag is required.
  private static readonly REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

  /** Send a Messenger reply from the connected Facebook Page. */
  async sendFacebook(
    tenantId: string,
    recipientPsid: string,
    text: string,
    lastInboundAt?: string | null,
  ): Promise<string> {
    const account = await this.accounts.get(tenantId, 'facebook');
    if (!account?.connected || !account.access_token) {
      throw new BadRequestException('Facebook is not connected');
    }
    return this.send(
      account.external_account_id as string,
      account.access_token as string,
      recipientPsid,
      text,
      lastInboundAt,
    );
  }

  /**
   * Send an Instagram Direct reply. IG messages route through the linked
   * Facebook Page, so we use the page id (stored on the IG account metadata)
   * with the page access token and the recipient's IGSID.
   */
  async sendInstagram(
    tenantId: string,
    recipientIgsid: string,
    text: string,
    lastInboundAt?: string | null,
  ): Promise<string> {
    const account = await this.accounts.get(tenantId, 'instagram');
    if (!account?.connected || !account.access_token) {
      throw new BadRequestException('Instagram is not connected');
    }
    const pageId = (account.metadata as { pageId?: string } | null)?.pageId;
    if (!pageId) {
      throw new BadRequestException('Instagram account is missing its linked page');
    }
    return this.send(
      pageId,
      account.access_token as string,
      recipientIgsid,
      text,
      lastInboundAt,
    );
  }

  /** Shared send path: POST /{pageId}/messages with the right messaging tag. */
  private async send(
    pageId: string,
    token: string,
    recipientId: string,
    text: string,
    lastInboundAt?: string | null,
  ): Promise<string> {
    const withinWindow =
      !!lastInboundAt &&
      Date.now() - new Date(lastInboundAt).getTime() <
        MetaMessagingService.REPLY_WINDOW_MS;

    const params: Record<string, string> = {
      recipient: JSON.stringify({ id: recipientId }),
      message: JSON.stringify({ text }),
      messaging_type: withinWindow ? 'RESPONSE' : 'MESSAGE_TAG',
      access_token: token,
    };
    // Outside the 24h window, only tagged messages are allowed. HUMAN_AGENT
    // covers a human following up on a customer enquiry (valid up to 7 days).
    if (!withinWindow) params.tag = 'HUMAN_AGENT';

    const res = await this.meta.graphPost<{ message_id?: string }>(
      `/${pageId}/messages`,
      params,
    );
    return res.message_id ?? '';
  }

  // ── Inbound ──────────────────────────────────────────────────────────────

  /**
   * Verify the X-Hub-Signature-256 header against the raw request body using the
   * app secret. Meta signs every webhook POST; an unsigned/forged body is dropped.
   */
  verifySignature(rawBody: Buffer | string | undefined, header?: string): boolean {
    const secret = this.config.get<string>('META_APP_SECRET');
    if (!secret || !rawBody || !header) return false;
    const expected =
      'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Parse a webhook payload and persist each inbound customer message. */
  async handleWebhook(payload: unknown): Promise<void> {
    for (const event of this.extractMessages(payload)) {
      try {
        await this.ingest(event);
      } catch (err) {
        // One bad event must not drop the rest of the batch.
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to ingest ${event.channel} message: ${msg}`);
      }
    }
  }

  /** Flatten a Messenger ("page") or Instagram ("instagram") webhook payload. */
  private extractMessages(payload: unknown): InboundMessage[] {
    const body = payload as {
      object?: string;
      entry?: {
        messaging?: {
          sender?: { id?: string };
          recipient?: { id?: string };
          timestamp?: number;
          message?: { mid?: string; text?: string; is_echo?: boolean };
        }[];
      }[];
    };
    const channel: MessagingChannel | null =
      body.object === 'page'
        ? 'facebook'
        : body.object === 'instagram'
          ? 'instagram'
          : null;
    if (!channel) return [];

    const out: InboundMessage[] = [];
    for (const entry of body.entry ?? []) {
      for (const m of entry.messaging ?? []) {
        // Echoes are messages the page itself sent — skip to avoid loops.
        if (m.message?.is_echo) continue;
        const senderId = m.sender?.id;
        const recipientId = m.recipient?.id;
        const messageId = m.message?.mid;
        const text = m.message?.text;
        if (!senderId || !recipientId || !messageId || !text) continue;
        out.push({
          channel,
          recipientId,
          senderId,
          messageId,
          text,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        });
      }
    }
    return out;
  }

  private async ingest(event: InboundMessage): Promise<void> {
    const account = await this.accounts.findByExternalAccount(
      event.channel,
      event.recipientId,
    );
    if (!account) {
      this.logger.warn(
        `No connected ${event.channel} account for ${event.recipientId}`,
      );
      return;
    }
    const tenantId = account.tenant_id as string;
    const token = account.access_token as string | undefined;

    const name = await this.fetchSenderName(event, token);
    const conversationId = await this.upsertConversation(
      tenantId,
      event,
      name,
    );
    const inserted = await this.insertInboundMessage(
      tenantId,
      conversationId,
      event,
    );
    // Only notify on genuinely new messages (deduped redeliveries return false).
    if (inserted) {
      await this.notifications.push(tenantId, {
        title: `New ${event.channel} message`,
        body: `${name}: ${event.text.slice(0, 120)}`,
        kind: 'customer',
      });
    }
  }

  /** Best-effort display name; falls back to a channel-generic label. */
  private async fetchSenderName(
    event: InboundMessage,
    token?: string,
  ): Promise<string> {
    if (!token) return this.fallbackName(event.channel);
    try {
      const fields = event.channel === 'instagram' ? 'name,username' : 'name';
      const profile = await this.meta.graph<{ name?: string; username?: string }>(
        `/${event.senderId}`,
        { fields, access_token: token },
      );
      return profile.name ?? profile.username ?? this.fallbackName(event.channel);
    } catch {
      return this.fallbackName(event.channel);
    }
  }

  private fallbackName(channel: MessagingChannel): string {
    return channel === 'instagram' ? 'Instagram user' : 'Facebook user';
  }

  /** Find the open thread for this sender or create one; returns its id. */
  private async upsertConversation(
    tenantId: string,
    event: InboundMessage,
    name: string,
  ): Promise<string> {
    const nowIso = event.timestamp.toISOString();
    const { data: existing } = await this.supabase.admin
      .from('conversations')
      .select('id, unread')
      .eq('tenant_id', tenantId)
      .eq('channel', event.channel)
      .eq('external_thread_id', event.senderId)
      .maybeSingle();

    if (existing) {
      await this.supabase.admin
        .from('conversations')
        .update({
          unread: (existing.unread ?? 0) + 1,
          last_message: event.text,
          last_timestamp: nowIso,
          last_inbound_at: nowIso,
        })
        .eq('id', existing.id);
      return existing.id as string;
    }

    const { data: created, error } = await this.supabase.admin
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        channel: event.channel,
        external_thread_id: event.senderId,
        customer_name: name,
        avatar_seed: event.senderId,
        unread: 1,
        last_message: event.text,
        last_timestamp: nowIso,
        last_inbound_at: nowIso,
      })
      .select('id')
      .single();
    if (error) throw error;
    return created.id as string;
  }

  /** Insert the inbound message; returns false if it was a deduped redelivery. */
  private async insertInboundMessage(
    tenantId: string,
    conversationId: string,
    event: InboundMessage,
  ): Promise<boolean> {
    const { error } = await this.supabase.admin.from('messages').insert({
      conversation_id: conversationId,
      tenant_id: tenantId,
      author: 'customer',
      direction: 'in',
      text: event.text,
      external_message_id: event.messageId,
      created_at: event.timestamp.toISOString(),
    });
    if (error) {
      // 23505 = unique violation on external_message_id → already ingested.
      if ((error as { code?: string }).code === '23505') return false;
      throw error;
    }
    return true;
  }
}
