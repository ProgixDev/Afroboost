import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SupabaseTokenService } from './supabase-token.service';
import { OwnerAuthGuard } from './guards/owner-auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Cross-cutting providers: auth guards, the Supabase token verifier, and the
 * JWT module (secrets are passed per-call). Global so any feature module can
 * apply the guards without re-importing.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    SupabaseTokenService,
    OwnerAuthGuard,
    AdminAuthGuard,
    RolesGuard,
  ],
  exports: [
    JwtModule,
    SupabaseTokenService,
    OwnerAuthGuard,
    AdminAuthGuard,
    RolesGuard,
  ],
})
export class CommonModule {}
