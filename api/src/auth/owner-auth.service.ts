import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseTokenService } from '../common/supabase-token.service';
import { OwnerContext } from '../common/types';
import { PreludeService } from './prelude.service';
import { RegisterOwnerDto } from './dto';

@Injectable()
export class OwnerAuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly tokens: SupabaseTokenService,
    private readonly prelude: PreludeService,
  ) {}

  /**
   * Provision a tenant + owner for a freshly signed-up Supabase user, or
   * return the existing owner if already linked. Idempotent.
   */
  async register(token: string, dto: RegisterOwnerDto): Promise<OwnerContext> {
    const payload = await this.tokens.verify(token);
    const authUserId = payload.sub;
    const email = (payload.email as string) ?? '';
    if (!authUserId) throw new UnauthorizedException('Token has no subject');

    const existing = await this.findOwnerByAuthId(authUserId);
    if (existing) return existing;

    const db = this.supabase.admin;

    // Create the tenant first (owner_id linked after the owner row exists).
    const { data: tenant, error: tErr } = await db
      .from('tenants')
      .insert({
        name: dto.businessName,
        type: dto.type ?? 'solo',
        status: 'trialing',
        plan: 'decouverte',
      })
      .select('id')
      .single();
    if (tErr || !tenant) {
      throw new BadRequestException(tErr?.message ?? 'Failed to create tenant');
    }

    const { data: owner, error: oErr } = await db
      .from('owners')
      .insert({
        auth_user_id: authUserId,
        tenant_id: tenant.id,
        name: dto.name,
        email,
        phone: dto.phone ?? null,
        email_verified: Boolean(payload.email_confirmed_at) || false,
      })
      .select('id, tenant_id, email')
      .single();
    if (oErr || !owner) {
      throw new BadRequestException(oErr?.message ?? 'Failed to create owner');
    }

    await db.from('tenants').update({ owner_id: owner.id }).eq('id', tenant.id);
    await db
      .from('business_profiles')
      .insert({ tenant_id: tenant.id })
      .then(() => undefined);

    return {
      authUserId,
      ownerId: owner.id,
      tenantId: owner.tenant_id,
      email: owner.email,
    };
  }

  async me(owner: OwnerContext) {
    const { data } = await this.supabase.admin
      .from('owners')
      .select(
        'id, name, email, phone, phone_verified, email_verified, tenant:tenants(id, name, plan, status, type)',
      )
      .eq('id', owner.ownerId)
      .single();
    return data;
  }

  async startPhoneVerification(phone: string) {
    return this.prelude.startVerification(phone);
  }

  async verifyPhone(owner: OwnerContext, phone: string, code: string) {
    const ok = await this.prelude.checkVerification(phone, code);
    if (!ok) throw new BadRequestException('Invalid verification code');
    await this.supabase.admin
      .from('owners')
      .update({ phone, phone_verified: true })
      .eq('id', owner.ownerId);
    return { verified: true };
  }

  private async findOwnerByAuthId(
    authUserId: string,
  ): Promise<OwnerContext | null> {
    const { data } = await this.supabase.admin
      .from('owners')
      .select('id, tenant_id, email')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (!data) return null;
    return {
      authUserId,
      ownerId: data.id,
      tenantId: data.tenant_id,
      email: data.email,
    };
  }
}
