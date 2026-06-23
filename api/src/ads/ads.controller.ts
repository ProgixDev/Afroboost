import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { AdsService } from './ads.service';
import {
  CreateAdDto,
  CreateAdSetDto,
  CreateCampaignDto,
  InsightsQuery,
  SelectAdAccountDto,
  UpdateStatusDto,
} from './dto';

/** Meta Ads campaign manager. Routes under /api/ads. */
@UseGuards(OwnerAuthGuard)
@Controller('ads')
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  // Ad account selection
  @Get('accounts')
  listAccounts(@CurrentTenant() tenantId: string) {
    return this.ads.listAdAccounts(tenantId);
  }

  @Post('accounts/select')
  selectAccount(
    @CurrentTenant() tenantId: string,
    @Body() dto: SelectAdAccountDto,
  ) {
    return this.ads.selectAdAccount(tenantId, dto.adAccountId);
  }

  // Campaigns
  @Get('campaigns')
  listCampaigns(@CurrentTenant() tenantId: string) {
    return this.ads.listCampaigns(tenantId);
  }

  @Post('campaigns')
  createCampaign(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.ads.createCampaign(tenantId, dto);
  }

  @Patch('campaigns/:id/status')
  setCampaignStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.ads.setCampaignStatus(tenantId, id, dto.status);
  }

  // Ad sets
  @Post('adsets')
  createAdSet(@CurrentTenant() tenantId: string, @Body() dto: CreateAdSetDto) {
    return this.ads.createAdSet(tenantId, dto);
  }

  // Ads
  @Post('ads')
  createAd(@CurrentTenant() tenantId: string, @Body() dto: CreateAdDto) {
    return this.ads.createAd(tenantId, dto);
  }

  // Insights
  @Get('insights')
  listInsights(
    @CurrentTenant() tenantId: string,
    @Query() query: InsightsQuery,
  ) {
    return this.ads.listInsights(tenantId, query.level ?? 'account');
  }

  @Post('insights/sync')
  syncInsights(
    @CurrentTenant() tenantId: string,
    @Query() query: InsightsQuery,
  ) {
    return this.ads.syncInsights(
      tenantId,
      query.level ?? 'account',
      query.since,
      query.until,
    );
  }
}
