import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * MOCK feeders for the channels that aren't wired to real providers yet
 * (voice/calls + WhatsApp). They populate the real tables so the frontend
 * works end-to-end; swap for real ingestion later without schema changes.
 */
@Injectable()
export class MockFeederService {
  constructor(private readonly supabase: SupabaseService) {}

  async seedCalls(tenantId: string) {
    const rows = [
      {
        tenant_id: tenantId,
        caller: 'Marie Tremblay',
        number: '+15145550148',
        duration_sec: 92,
        intent: 'reservation',
        handled_by: 'ai',
        transcript: ['Bonjour, je voudrais réserver une table pour 4.', 'Bien sûr, pour quelle heure ?'],
      },
      {
        tenant_id: tenantId,
        caller: 'Unknown',
        number: '+15145550199',
        duration_sec: 45,
        intent: 'hours',
        handled_by: 'ai',
        transcript: ['Êtes-vous ouverts dimanche ?', 'Oui, de 12h à 21h.'],
      },
    ];
    await this.supabase.admin.from('calls').insert(rows);
    return { seeded: rows.length };
  }

  async seedWhatsApp(tenantId: string) {
    const { data: convo } = await this.supabase.admin
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        channel: 'whatsapp',
        customer_name: 'Jean Baptiste',
        unread: 1,
        last_message: 'Avez-vous des plats végétariens ?',
        last_timestamp: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (convo?.id) {
      await this.supabase.admin.from('messages').insert({
        conversation_id: convo.id,
        tenant_id: tenantId,
        author: 'customer',
        text: 'Avez-vous des plats végétariens ?',
      });
    }
    return { conversationId: convo?.id };
  }
}
