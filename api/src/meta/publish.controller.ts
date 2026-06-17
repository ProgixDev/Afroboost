import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { SchedulePostDto } from '../posts/dto';
import { PublishService } from './publish.service';

/** Publish / schedule actions on posts. Routes under /api/posts/:id. */
@UseGuards(OwnerAuthGuard)
@Controller('posts')
export class PublishController {
  constructor(private readonly publish: PublishService) {}

  @Post(':id/publish')
  publishNow(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.publish.publishNow(tenantId, id);
  }

  @Post(':id/schedule')
  schedule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SchedulePostDto,
  ) {
    return this.publish.schedule(tenantId, id, dto.scheduledAt);
  }
}
