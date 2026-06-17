import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { ReviewsService } from './reviews.service';

class ApproveDto {
  @IsString()
  @IsOptional()
  reply?: string;
}

@UseGuards(OwnerAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query('status') status?: string) {
    return this.reviews.list(tenantId, status);
  }

  @Post('sync')
  sync(@CurrentTenant() tenantId: string) {
    return this.reviews.sync(tenantId);
  }

  @Post(':id/approve')
  approve(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApproveDto,
  ) {
    return this.reviews.approve(tenantId, id, dto.reply);
  }

  @Post(':id/reject')
  reject(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reviews.reject(tenantId, id);
  }
}
