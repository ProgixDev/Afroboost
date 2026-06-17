import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAiService } from '../ai/openai.service';
import { GoogleOAuthService } from '../google/google-oauth.service';
import { ConnectedAccountsService } from '../integrations/connected-accounts.service';

const GMB = 'https://mybusiness.googleapis.com/v4';
const FIELDS =
  'id, author, rating, snippet, draft_reply, status, external_review_id, reply_published_at, created_at';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly openai: OpenAiService,
    private readonly google: GoogleOAuthService,
    private readonly accounts: ConnectedAccountsService,
  ) {}

  async list(tenantId: string, status?: string) {
    let q = this.supabase.admin
      .from('reviews')
      .select(FIELDS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data } = await q;
    return data ?? [];
  }

  /**
   * Pull reviews from Google Business Profile and upsert them, generating an
   * AI draft reply for any new ones. Requires the location resource name to be
   * stored in the connected account metadata as `locationName`
   * (e.g. "accounts/123/locations/456").
   */
  async sync(tenantId: string) {
    const account = await this.accounts.get(tenantId, 'google');
    const locationName = (account?.metadata as { locationName?: string } | null)?.locationName;
    if (!locationName) {
      throw new BadRequestException(
        'Google Business location not configured (metadata.locationName).',
      );
    }
    const token = await this.google.getAccessToken(tenantId, 'google');
    const res = await fetch(`${GMB}/${locationName}/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      this.logger.error(`GMB reviews fetch failed: ${res.status}`);
      throw new BadRequestException('Failed to fetch Google reviews');
    }
    const body = (await res.json()) as {
      reviews?: Array<{
        name: string;
        reviewId: string;
        reviewer?: { displayName?: string };
        starRating?: string;
        comment?: string;
      }>;
    };

    const starMap: Record<string, number> = {
      ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
    };
    let imported = 0;
    for (const r of body.reviews ?? []) {
      const rating = starMap[r.starRating ?? 'FIVE'] ?? 5;
      const draft = await this.draftReply(tenantId, r.comment ?? '', rating);
      const { error } = await this.supabase.admin.from('reviews').upsert(
        {
          tenant_id: tenantId,
          author: r.reviewer?.displayName ?? 'Google user',
          rating,
          snippet: r.comment ?? '',
          draft_reply: draft,
          status: 'pending',
          external_review_id: r.name,
        },
        { onConflict: 'tenant_id,external_review_id', ignoreDuplicates: true },
      );
      if (!error) imported += 1;
    }
    return { imported };
  }

  async approve(tenantId: string, id: string, reply?: string) {
    const review = await this.getRow(tenantId, id);
    const comment = reply ?? review.draft_reply;
    if (!comment) throw new BadRequestException('No reply text');

    // Publish to Google if this review came from there.
    if (review.external_review_id) {
      const token = await this.google.getAccessToken(tenantId, 'google');
      const res = await fetch(`${GMB}/${review.external_review_id}/reply`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) {
        this.logger.error(`GMB reply publish failed: ${res.status}`);
        throw new BadRequestException('Failed to publish reply to Google');
      }
    }

    const { data } = await this.supabase.admin
      .from('reviews')
      .update({
        status: 'approved',
        draft_reply: comment,
        reply_published_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select(FIELDS)
      .single();
    return data;
  }

  async reject(tenantId: string, id: string) {
    await this.getRow(tenantId, id);
    const { data } = await this.supabase.admin
      .from('reviews')
      .update({ status: 'rejected' })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select(FIELDS)
      .single();
    return data;
  }

  private async draftReply(tenantId: string, snippet: string, rating: number) {
    const { data: tenant } = await this.supabase.admin
      .from('tenants')
      .select('name, tone, languages')
      .eq('id', tenantId)
      .single();
    try {
      return await this.openai.generateCaption({
        prompt:
          `Write a short, polite reply to this ${rating}-star customer review: "${snippet}". ` +
          `Thank them and address concerns if the rating is low. No hashtags.`,
        tone: (tenant?.tone as string) ?? 'warm',
        businessName: tenant?.name as string,
        language: (tenant?.languages?.[0] as string) ?? 'fr',
      });
    } catch (err) {
      this.logger.warn(`Draft generation failed: ${err instanceof Error ? err.message : err}`);
      return '';
    }
  }

  private async getRow(tenantId: string, id: string) {
    const { data } = await this.supabase.admin
      .from('reviews')
      .select('id, draft_reply, external_review_id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!data) throw new NotFoundException('Review not found');
    return data;
  }
}
