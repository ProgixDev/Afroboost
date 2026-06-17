import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectedAccountsService } from '../integrations/connected-accounts.service';

const GRAPH = 'https://graph.facebook.com/v21.0';
const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
];

interface PublishInput {
  caption: string;
  mediaUrl?: string | null;
}

/**
 * Meta (Facebook + Instagram) OAuth and Graph publishing.
 *
 * Build & test against Meta TEST USERS / dev mode first. Going live needs
 * Business Verification + App Review for the publishing permissions — that
 * runs as a parallel track and does not block development.
 */
@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly accounts: ConnectedAccountsService,
  ) {}

  // ── OAuth ────────────────────────────────────────────────────────────────

  getAuthUrl(tenantId: string): string {
    const appId = this.required('META_APP_ID');
    const redirect = this.required('META_REDIRECT_URI');
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirect,
      state: tenantId,
      response_type: 'code',
      scope: SCOPES.join(','),
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code: string, tenantId: string): Promise<void> {
    const appId = this.required('META_APP_ID');
    const appSecret = this.required('META_APP_SECRET');
    const redirect = this.required('META_REDIRECT_URI');

    // 1. Code → short-lived user token.
    const short = await this.graph<{ access_token: string }>('/oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirect,
      code,
    });

    // 2. Short → long-lived user token.
    const long = await this.graph<{ access_token: string; expires_in?: number }>(
      '/oauth/access_token',
      {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: short.access_token,
      },
    );

    // 3. Pages the user manages (+ linked IG business accounts).
    const pages = await this.graph<{
      data: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string; username?: string };
      }>;
    }>('/me/accounts', {
      access_token: long.access_token,
      fields: 'id,name,access_token,instagram_business_account{id,username}',
    });

    const page = pages.data?.[0];
    if (!page) throw new BadRequestException('No Facebook Page found for this user');

    const expiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000).toISOString()
      : null;

    await this.accounts.upsert(tenantId, 'facebook', {
      connected: true,
      accessToken: page.access_token,
      tokenExpiresAt: expiresAt,
      scopes: SCOPES,
      externalAccountId: page.id,
      externalAccountName: page.name,
      metadata: { userAccessToken: long.access_token, pages: pages.data },
    });

    if (page.instagram_business_account) {
      await this.accounts.upsert(tenantId, 'instagram', {
        connected: true,
        accessToken: page.access_token,
        tokenExpiresAt: expiresAt,
        scopes: SCOPES,
        externalAccountId: page.instagram_business_account.id,
        externalAccountName: page.instagram_business_account.username ?? null,
        metadata: { pageId: page.id },
      });
    }
  }

  // ── Publishing ─────────────────────────────────────────────────────────

  async publishFacebook(tenantId: string, input: PublishInput): Promise<string> {
    const account = await this.accounts.get(tenantId, 'facebook');
    if (!account?.connected || !account.access_token) {
      throw new BadRequestException('Facebook is not connected');
    }
    const pageId = account.external_account_id as string;
    const token = account.access_token as string;

    if (input.mediaUrl) {
      const res = await this.graphPost<{ post_id?: string; id: string }>(
        `/${pageId}/photos`,
        { url: input.mediaUrl, caption: input.caption, access_token: token },
      );
      return res.post_id ?? res.id;
    }
    const res = await this.graphPost<{ id: string }>(`/${pageId}/feed`, {
      message: input.caption,
      access_token: token,
    });
    return res.id;
  }

  async publishInstagram(tenantId: string, input: PublishInput): Promise<string> {
    const account = await this.accounts.get(tenantId, 'instagram');
    if (!account?.connected || !account.access_token) {
      throw new BadRequestException('Instagram is not connected');
    }
    if (!input.mediaUrl) {
      throw new BadRequestException('Instagram posts require media');
    }
    const igId = account.external_account_id as string;
    const token = account.access_token as string;

    // 1. Create a media container.
    const container = await this.graphPost<{ id: string }>(`/${igId}/media`, {
      image_url: input.mediaUrl,
      caption: input.caption,
      access_token: token,
    });
    // 2. Publish it.
    const published = await this.graphPost<{ id: string }>(
      `/${igId}/media_publish`,
      { creation_id: container.id, access_token: token },
    );
    return published.id;
  }

  async getEngagement(
    tenantId: string,
    channel: 'facebook' | 'instagram',
    externalId: string,
  ): Promise<{ likes: number; comments: number; reach: number }> {
    const account = await this.accounts.get(tenantId, channel);
    const token = account?.access_token as string | undefined;
    if (!token) return { likes: 0, comments: 0, reach: 0 };

    if (channel === 'instagram') {
      const m = await this.graph<{ like_count?: number; comments_count?: number }>(
        `/${externalId}`,
        { fields: 'like_count,comments_count', access_token: token },
      );
      return { likes: m.like_count ?? 0, comments: m.comments_count ?? 0, reach: 0 };
    }
    const p = await this.graph<{
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
    }>(`/${externalId}`, {
      fields: 'likes.summary(true),comments.summary(true)',
      access_token: token,
    });
    return {
      likes: p.likes?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      reach: 0,
    };
  }

  // ── Graph helpers ─────────────────────────────────────────────────────

  private async graph<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = `${GRAPH}${path}?${new URLSearchParams(params).toString()}`;
    const res = await fetch(url);
    return this.parse<T>(res);
  }

  private async graphPost<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const res = await fetch(`${GRAPH}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    return this.parse<T>(res);
  }

  private async parse<T>(res: Response): Promise<T> {
    const body = (await res.json()) as T & { error?: { message: string } };
    if (!res.ok || body.error) {
      const message = body.error?.message ?? `Graph API error ${res.status}`;
      this.logger.error(`Meta Graph: ${message}`);
      throw new ServiceUnavailableException(`Meta: ${message}`);
    }
    return body;
  }

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new ServiceUnavailableException(`${key} is not configured`);
    return value;
  }
}
