import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { GenerationService } from './generation.service';
import { GenerateContentDto } from './dto';

/** Async AI content generation. Routes under /api/content. */
@UseGuards(OwnerAuthGuard)
@Controller('content')
export class GenerationController {
  constructor(private readonly generation: GenerationService) {}

  /** Kick off a generation job; returns a jobId to poll. */
  @Post('generate')
  generate(
    @CurrentTenant() tenantId: string,
    @Body() dto: GenerateContentDto,
  ) {
    return this.generation.enqueue(tenantId, dto);
  }

  /** Poll a generation job's status + result. */
  @Get('generate/:jobId')
  getJob(
    @CurrentTenant() tenantId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.generation.getJob(tenantId, jobId);
  }
}
