import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConnectedAccountsService } from '../integrations/connected-accounts.service';
import { MetaService } from '../meta/meta.service';
import {
  CreateAdDto,
  CreateAdSetDto,
  CreateCampaignDto,
} from './dto';

/**
 * Meta Ads (Marketing API) campaign manager.
 *
 * Ad-account operations require the *user* access token (with ads_management)
 * stored on the Facebook connection — page tokens cannot manage ad accounts.
 * New objects are always created PAUSED so nothing spends without an explicit
 * activation. Meta is the source of truth; we mirror a minimal copy locally.
 */
@Injectable()
export class AdsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly accounts: ConnectedAccountsService,
    private readonly meta: MetaService,
  ) {}

  // ── Account selection ──────────────────────────────────────────────────

  /** List the ad accounts the connected user can manage. */
  async listAdAccounts(tenantId: string) {
    const token = await this.userToken(tenantId);
    const res = await this.meta.graph<{
      data: { id: string; name?: string; account_status?: number; currency?: string }[];
    }>('/me/adaccounts', {
      access_token: token,
      fields: 'id,name,account_status,currency',
    });
    return res.data ?? [];
  }

  /** Persist the chosen ad account id on the Facebook connection metadata. */
  async selectAdAccount(tenantId: string, adAccountId: string) {
    const account = await this.requireFacebook(tenantId);
    const metadata = {
      ...((account.metadata as Record<string, unknown>) ?? {}),
      adAccountId,
    };
    await this.accounts.upsert(tenantId, 'facebook', { metadata });
    return { adAccountId };
  }

  // ── Campaigns ──────────────────────────────────────────────────────────

  async listCampaigns(tenantId: string) {
    const { data } = await this.supabase.admin
      .from('ad_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async createCampaign(tenantId: string, dto: CreateCampaignDto) {
    const { adAccountId, token } = await this.requireAdAccount(tenantId);
    const params: Record<string, string> = {
      name: dto.name,
      objective: dto.objective,
      status: 'PAUSED',
      // Required by the API; we are not running special-category (housing,
      // employment, credit, social issues) ads.
      special_ad_categories: '[]',
      access_token: token,
    };
    if (dto.dailyBudget) params.daily_budget = String(dto.dailyBudget);

    const created = await this.meta.graphPost<{ id: string }>(
      `/${adAccountId}/campaigns`,
      params,
    );

    const { data } = await this.supabase.admin
      .from('ad_campaigns')
      .insert({
        tenant_id: tenantId,
        external_id: created.id,
        name: dto.name,
        objective: dto.objective,
        status: 'PAUSED',
        daily_budget: dto.dailyBudget ?? null,
      })
      .select('*')
      .single();
    return data;
  }

  async setCampaignStatus(tenantId: string, id: string, status: 'ACTIVE' | 'PAUSED') {
    const campaign = await this.requireCampaign(tenantId, id);
    const token = await this.userToken(tenantId);
    await this.meta.graphPost(`/${campaign.external_id}`, { status, access_token: token });
    const { data } = await this.supabase.admin
      .from('ad_campaigns')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
    return data;
  }

  // ── Ad sets ────────────────────────────────────────────────────────────

  async createAdSet(tenantId: string, dto: CreateAdSetDto) {
    const { adAccountId, token } = await this.requireAdAccount(tenantId);
    const campaign = await this.requireCampaign(tenantId, dto.campaignId);

    // Targeting is required by the API; default to country-level reach when the
    // caller has not supplied a spec yet.
    const targeting = dto.targeting ?? { geo_locations: { countries: ['CA'] } };
    const optimizationGoal = dto.optimizationGoal ?? 'REACH';
    const billingEvent = dto.billingEvent ?? 'IMPRESSIONS';

    const params: Record<string, string> = {
      name: dto.name,
      campaign_id: campaign.external_id as string,
      daily_budget: String(dto.dailyBudget),
      billing_event: billingEvent,
      optimization_goal: optimizationGoal,
      targeting: JSON.stringify(targeting),
      status: 'PAUSED',
      access_token: token,
    };
    if (dto.startTime) params.start_time = dto.startTime;
    if (dto.endTime) params.end_time = dto.endTime;

    const created = await this.meta.graphPost<{ id: string }>(
      `/${adAccountId}/adsets`,
      params,
    );

    const { data } = await this.supabase.admin
      .from('ad_sets')
      .insert({
        tenant_id: tenantId,
        campaign_id: campaign.id,
        external_id: created.id,
        name: dto.name,
        status: 'PAUSED',
        daily_budget: dto.dailyBudget,
        optimization_goal: optimizationGoal,
        billing_event: billingEvent,
        targeting,
        start_time: dto.startTime ?? null,
        end_time: dto.endTime ?? null,
      })
      .select('*')
      .single();
    return data;
  }

  // ── Ads ────────────────────────────────────────────────────────────────

  async createAd(tenantId: string, dto: CreateAdDto) {
    const { adAccountId, token } = await this.requireAdAccount(tenantId);
    const adSet = await this.requireAdSet(tenantId, dto.adSetId);
    if (!dto.pagePostId) {
      throw new BadRequestException(
        'pagePostId is required (ads promote an existing page post)',
      );
    }

    // 1. Build a creative from the existing page post.
    const creative = await this.meta.graphPost<{ id: string }>(
      `/${adAccountId}/adcreatives`,
      { object_story_id: dto.pagePostId, access_token: token },
    );
    // 2. Create the ad referencing the creative.
    const created = await this.meta.graphPost<{ id: string }>(
      `/${adAccountId}/ads`,
      {
        name: dto.name,
        adset_id: adSet.external_id as string,
        creative: JSON.stringify({ creative_id: creative.id }),
        status: 'PAUSED',
        access_token: token,
      },
    );

    const { data } = await this.supabase.admin
      .from('ads')
      .insert({
        tenant_id: tenantId,
        adset_id: adSet.id,
        external_id: created.id,
        name: dto.name,
        status: 'PAUSED',
        post_id: dto.postId ?? null,
        creative: { creativeId: creative.id, pagePostId: dto.pagePostId },
      })
      .select('*')
      .single();
    return data;
  }

  // ── Insights ───────────────────────────────────────────────────────────

  /**
   * Pull per-day insights for the ad account (or a level beneath it) from the
   * Graph API and upsert them into the cache, then return the cached rows.
   */
  async syncInsights(
    tenantId: string,
    level: 'account' | 'campaign' | 'adset' | 'ad' = 'account',
    since?: string,
    until?: string,
  ) {
    const { adAccountId, token } = await this.requireAdAccount(tenantId);
    const params: Record<string, string> = {
      access_token: token,
      level,
      time_increment: '1',
      fields:
        'date_start,spend,impressions,reach,clicks,ctr,cpc,purchase_roas,campaign_id,adset_id,ad_id',
    };
    if (since && until) {
      params.time_range = JSON.stringify({ since: since.slice(0, 10), until: until.slice(0, 10) });
    } else {
      params.date_preset = 'last_30d';
    }

    const res = await this.meta.graph<{
      data: Record<string, unknown>[];
    }>(`/${adAccountId}/insights`, params);

    const rows = (res.data ?? []).map((r) => this.normalizeInsight(tenantId, level, adAccountId, r));
    if (rows.length) {
      await this.supabase.admin
        .from('ad_insights')
        .upsert(rows, { onConflict: 'tenant_id,level,external_id,date' });
    }
    return rows;
  }

  async listInsights(tenantId: string, level = 'account') {
    const { data } = await this.supabase.admin
      .from('ad_insights')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('level', level)
      .order('date', { ascending: true });
    return data ?? [];
  }

  private normalizeInsight(
    tenantId: string,
    level: string,
    adAccountId: string,
    r: Record<string, unknown>,
  ) {
    const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
    const externalId =
      level === 'campaign'
        ? (r.campaign_id as string)
        : level === 'adset'
          ? (r.adset_id as string)
          : level === 'ad'
            ? (r.ad_id as string)
            : adAccountId;
    // purchase_roas comes back as an array of {action_type, value}.
    const roasArr = r.purchase_roas as { value?: string }[] | undefined;
    const roas = roasArr?.length ? num(roasArr[0].value) : 0;
    return {
      tenant_id: tenantId,
      level,
      external_id: externalId,
      date: (r.date_start as string) ?? new Date().toISOString().slice(0, 10),
      spend: num(r.spend),
      impressions: num(r.impressions),
      reach: num(r.reach),
      clicks: num(r.clicks),
      ctr: num(r.ctr),
      cpc: num(r.cpc),
      conversions: 0,
      roas,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async requireFacebook(tenantId: string) {
    const account = await this.accounts.get(tenantId, 'facebook');
    if (!account?.connected) {
      throw new BadRequestException('Facebook is not connected');
    }
    return account;
  }

  /** The user access token (carries ads_management), stored at connect time. */
  private async userToken(tenantId: string): Promise<string> {
    const account = await this.requireFacebook(tenantId);
    const token = (account.metadata as { userAccessToken?: string } | null)
      ?.userAccessToken;
    if (!token) {
      throw new BadRequestException('Missing user access token — reconnect Facebook');
    }
    return token;
  }

  private async requireAdAccount(
    tenantId: string,
  ): Promise<{ adAccountId: string; token: string }> {
    const account = await this.requireFacebook(tenantId);
    const metadata = account.metadata as
      | { adAccountId?: string; userAccessToken?: string }
      | null;
    if (!metadata?.adAccountId) {
      throw new BadRequestException('No ad account selected');
    }
    if (!metadata.userAccessToken) {
      throw new BadRequestException('Missing user access token — reconnect Facebook');
    }
    return { adAccountId: metadata.adAccountId, token: metadata.userAccessToken };
  }

  private async requireCampaign(tenantId: string, id: string) {
    const { data } = await this.supabase.admin
      .from('ad_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!data) throw new NotFoundException('Campaign not found');
    return data;
  }

  private async requireAdSet(tenantId: string, id: string) {
    const { data } = await this.supabase.admin
      .from('ad_sets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!data) throw new NotFoundException('Ad set not found');
    return data;
  }
}
