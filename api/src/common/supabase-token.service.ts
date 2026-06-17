import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  jwtVerify,
  JWTPayload,
  JWTVerifyGetKey,
} from 'jose';

/**
 * Verifies Supabase access tokens. Prefers the project's JWKS (asymmetric
 * keys); falls back to the legacy HS256 shared secret when
 * SUPABASE_JWT_SECRET is set. Shared by OwnerAuthGuard and the registration
 * flow (which runs before an owner row exists).
 */
@Injectable()
export class SupabaseTokenService {
  private jwks?: JWTVerifyGetKey;

  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<JWTPayload> {
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    try {
      if (secret) {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret),
        );
        return payload;
      }
      const { payload } = await jwtVerify(token, this.getJwks());
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getJwks(): JWTVerifyGetKey {
    if (!this.jwks) {
      const url = this.config.get<string>('SUPABASE_URL');
      if (!url) throw new UnauthorizedException('Supabase is not configured');
      this.jwks = createRemoteJWKSet(
        new URL(`${url}/auth/v1/.well-known/jwks.json`),
      );
    }
    return this.jwks;
  }
}
