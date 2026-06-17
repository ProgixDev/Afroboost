import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { NotificationsService } from './notifications.service';

@UseGuards(OwnerAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.notifications.list(tenantId);
  }

  @Post(':id/read')
  read(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.notifications.markRead(tenantId, id);
  }

  @Post('read-all')
  readAll(@CurrentTenant() tenantId: string) {
    return this.notifications.markAllRead(tenantId);
  }
}
