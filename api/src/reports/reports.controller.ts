import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { ReportsService } from './reports.service';

@UseGuards(OwnerAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.reports.list(tenantId);
  }

  @Post('generate')
  generate(@CurrentTenant() tenantId: string) {
    return this.reports.generateForTenant(tenantId);
  }
}
