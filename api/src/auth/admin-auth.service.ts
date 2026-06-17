import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminContext, AdminRole } from '../common/types';
import { hashPassword, verifyPassword } from '../common/crypto/password';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const { data: admin } = await this.supabase.admin
      .from('admin_users')
      .select('id, email, role, status, password_hash')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!admin || admin.status === 'disabled') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await verifyPassword(password, admin.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.supabase.admin
      .from('admin_users')
      .update({ last_active_at: new Date().toISOString(), status: 'active' })
      .eq('id', admin.id);

    const token = await this.sign({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });
    return { token, admin: { id: admin.id, email: admin.email, role: admin.role } };
  }

  async me(ctx: AdminContext) {
    const { data } = await this.supabase.admin
      .from('admin_users')
      .select('id, name, email, role, status, last_active_at, created_at')
      .eq('id', ctx.adminId)
      .single();
    return data;
  }

  /**
   * Create or update an admin account with a password. Used both by the
   * seed script and by the super-admin "invite admin" flow (Phase 7).
   */
  async upsertAdmin(input: {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
  }) {
    const password_hash = await hashPassword(input.password);
    const { data, error } = await this.supabase.admin
      .from('admin_users')
      .upsert(
        {
          name: input.name,
          email: input.email.toLowerCase(),
          password_hash,
          role: input.role,
          status: 'active',
        },
        { onConflict: 'email' },
      )
      .select('id, email, role')
      .single();
    if (error) throw error;
    return data;
  }

  private sign(ctx: AdminContext): Promise<string> {
    const secret = this.config.get<string>('ADMIN_JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('ADMIN_JWT_SECRET is not configured');
    }
    return this.jwt.signAsync(
      { sub: ctx.adminId, email: ctx.email, role: ctx.role },
      {
        secret,
        expiresIn: this.config.get<string>('ADMIN_JWT_EXPIRES_IN', '12h'),
      },
    );
  }
}
