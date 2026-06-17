import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { BillingService } from './billing.service';

class CheckoutDto {
  @IsIn(['decouverte', 'performance', 'premium'])
  plan!: 'decouverte' | 'performance' | 'premium';
}

@UseGuards(OwnerAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  checkout(@CurrentTenant() tenantId: string, @Body() dto: CheckoutDto) {
    return this.billing.checkout(tenantId, dto.plan);
  }

  @Post('portal')
  portal(@CurrentTenant() tenantId: string) {
    return this.billing.portal(tenantId);
  }

  @Get('subscription')
  subscription(@CurrentTenant() tenantId: string) {
    return this.billing.summary(tenantId);
  }
}
