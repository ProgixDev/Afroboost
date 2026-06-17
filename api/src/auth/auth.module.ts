import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AdminAuthController } from './admin-auth.controller';
import { OwnerAuthService } from './owner-auth.service';
import { AdminAuthService } from './admin-auth.service';
import { PreludeService } from './prelude.service';

@Module({
  controllers: [AuthController, AdminAuthController],
  providers: [OwnerAuthService, AdminAuthService, PreludeService],
  exports: [AdminAuthService],
})
export class AuthModule {}
