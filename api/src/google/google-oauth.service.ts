import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedAccountsService,
  Provider,
} from '../integrations/connected-accounts.service';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const GOOGLE_SCOPES: Record<string, string[]> = {
  google: ['https://www.googleapis.com/auth/business.manage'],
  gmail: [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
  ],
};

/** Google OAuth (offline) shared by Business reviews and Gmail. */
@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly accounts: ConnectedAccountsService,
  ) {}

  /** state = `${tenantId}:${provider}` so the callback knows where to store. */
  getAuthUrl(tenantId: string, provider: 'google' | 'gmail'): string {
    const params = new URLSearchParams({
      client_id: this.required('GOOGLE_CLIENT_ID'),
      redirect_uri: this.required('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: GOOGLE_SCOPES[provider].join(' '),
      state: `${tenantId}:${provider}`,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const [tenantId, provider] = state.split(':');
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.required('GOOGLE_CLIENT_ID'),
        client_secret: this.required('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.required('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }).toString(),
    });
    const token = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!res.ok || !token.access_token) {
      throw new ServiceUnavailableException(`Google token exchange failed: ${token.error}`);
    }
    await this.accounts.upsert(tenantId, provider as Provider, {
      connected: true,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      tokenExpiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
      scopes: GOOGLE_SCOPES[provider],
    });
  }

  /** Returns a valid access token for a provider, refreshing if expired. */
  async getAccessToken(tenantId: string, provider: 'google' | 'gmail'): Promise<string> {
    const account = await this.accounts.get(tenantId, provider);
    if (!account?.access_token) {
      throw new ServiceUnavailableException(`${provider} is not connected`);
    }
    const expired =
      account.token_expires_at &&
      new Date(account.token_expires_at as string).getTime() < Date.now() + 60_000;
    if (!expired) return account.access_token as string;
    if (!account.refresh_token) return account.access_token as string;

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: account.refresh_token as string,
        client_id: this.required('GOOGLE_CLIENT_ID'),
        client_secret: this.required('GOOGLE_CLIENT_SECRET'),
        grant_type: 'refresh_token',
      }).toString(),
    });
    const token = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!token.access_token) {
      throw new ServiceUnavailableException(`${provider} token refresh failed`);
    }
    await this.accounts.upsert(tenantId, provider as Provider, {
      accessToken: token.access_token,
      tokenExpiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
    });
    return token.access_token;
  }

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new ServiceUnavailableException(`${key} is not configured`);
    return value;
  }
}
