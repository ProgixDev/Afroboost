import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { AdminContext } from '../common/types';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto';

/** Operator (admin console) auth. Routes are under /api/admin/auth. */
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto.email, dto.password);
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  me(@CurrentAdmin() admin: AdminContext) {
    return this.adminAuth.me(admin);
  }
}
