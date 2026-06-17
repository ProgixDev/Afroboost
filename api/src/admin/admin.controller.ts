import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { AdminContext } from '../common/types';
import { AdminService } from './admin.service';
import { MetricsService } from './metrics.service';
import { AuditService } from '../audit/audit.service';
import { AdminAuthService } from '../auth/admin-auth.service';

class ChangePlanDto {
  @IsIn(['decouverte', 'performance', 'premium'])
  plan!: 'decouverte' | 'performance' | 'premium';
}
class InviteAdminDto {
  @IsString() @MinLength(1) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsIn(['super_admin', 'support', 'analyst', 'viewer']) role!:
    | 'super_admin'
    | 'support'
    | 'analyst'
    | 'viewer';
}

/** Operator console API. All routes require an admin JWT; some require roles. */
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly metrics: MetricsService,
    private readonly audit: AuditService,
    private readonly adminAuth: AdminAuthService,
  ) {}

  @Get('overview')
  overview() {
    return this.metrics.overview();
  }

  @Get('tenants')
  tenants(@Query('search') search?: string, @Query('status') status?: string) {
    return this.admin.listTenants(search, status);
  }

  @Get('tenants/:id')
  tenant(@Param('id') id: string) {
    return this.admin.getTenant(id);
  }

  @Roles('super_admin', 'support')
  @Post('tenants/:id/suspend')
  suspend(@Param('id') id: string, @CurrentAdmin() admin: AdminContext) {
    return this.admin.setStatus(id, 'suspended', admin);
  }

  @Roles('super_admin', 'support')
  @Post('tenants/:id/reactivate')
  reactivate(@Param('id') id: string, @CurrentAdmin() admin: AdminContext) {
    return this.admin.setStatus(id, 'active', admin);
  }

  @Roles('super_admin')
  @Post('tenants/:id/plan')
  changePlan(
    @Param('id') id: string,
    @Body() dto: ChangePlanDto,
    @CurrentAdmin() admin: AdminContext,
  ) {
    return this.admin.changePlan(id, dto.plan, admin);
  }

  @Roles('super_admin')
  @Post('invoices/:id/refund')
  refund(@Param('id') id: string, @CurrentAdmin() admin: AdminContext) {
    return this.admin.refundInvoice(id, admin);
  }

  @Get('usage')
  usage() {
    return this.admin.listUsage();
  }

  @Get('support')
  support(@Query('status') status?: string) {
    return this.admin.listSupport(status);
  }

  @Roles('super_admin', 'support')
  @Post('support/:id/resolve')
  resolve(@Param('id') id: string, @CurrentAdmin() admin: AdminContext) {
    return this.admin.resolveTicket(id, admin);
  }

  @Get('audit')
  auditLog() {
    return this.audit.list();
  }

  @Roles('super_admin')
  @Post('admins')
  async invite(@Body() dto: InviteAdminDto, @CurrentAdmin() admin: AdminContext) {
    const created = await this.adminAuth.upsertAdmin(dto);
    await this.audit.record({
      actor: admin.email,
      actorAdminId: admin.adminId,
      action: 'invite_admin',
      target: dto.email,
    });
    return created;
  }
}
