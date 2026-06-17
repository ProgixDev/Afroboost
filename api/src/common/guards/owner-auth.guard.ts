import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SupabaseTokenService } from '../supabase-token.service';
import { AuthedRequest } from '../types';

/**
 * Authenticates business owners via their Supabase access token, then resolves
 * the owner + tenant from the `owners` table by auth_user_id.
 */
@Injectable()
export class OwnerAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: SupabaseTokenService,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const payload = await this.tokens.verify(token);
    const authUserId = payload.sub;
    if (!authUserId) throw new UnauthorizedException('Token has no subject');

    const { data: owner, error } = await this.supabase.admin
      .from('owners')
      .select('id, tenant_id, email')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) throw new UnauthorizedException('Failed to resolve owner');
    if (!owner) {
      throw new UnauthorizedException('No owner is linked to this account');
    }

    req.owner = {
      authUserId,
      ownerId: owner.id,
      tenantId: owner.tenant_id,
      email: owner.email ?? (payload.email as string) ?? '',
    };
    return true;
  }
}

export function extractBearer(req: AuthedRequest): string | null {
  const header = req.headers['authorization'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim();
}
