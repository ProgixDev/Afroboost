import { Controller, Get, UseGuards } from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { UsageService } from './usage.service';

@UseGuards(OwnerAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  /** Current-period usage + limits for the authenticated tenant. */
  @Get()
  current(@CurrentTenant() tenantId: string) {
    return this.usage.getForTenant(tenantId);
  }
}
