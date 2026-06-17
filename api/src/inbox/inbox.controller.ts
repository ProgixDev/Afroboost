import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { InboxService } from './inbox.service';
import { CallsService } from './calls.service';
import { MockFeederService } from './mock-feeder.service';

class ReplyDto {
  @IsString()
  @MinLength(1)
  text!: string;
}

@UseGuards(OwnerAuthGuard)
@Controller('inbox')
export class InboxController {
  constructor(
    private readonly inbox: InboxService,
    private readonly calls: CallsService,
    private readonly mock: MockFeederService,
  ) {}

  @Get('conversations')
  conversations(
    @CurrentTenant() tenantId: string,
    @Query('channel') channel?: string,
  ) {
    return this.inbox.listConversations(tenantId, channel);
  }

  @Get('conversations/:id')
  conversation(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inbox.getConversation(tenantId, id);
  }

  @Post('conversations/:id/reply')
  reply(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReplyDto,
  ) {
    return this.inbox.reply(tenantId, id, dto.text);
  }

  @Get('calls')
  listCalls(@CurrentTenant() tenantId: string) {
    return this.calls.list(tenantId);
  }

  /** Dev helper: seed mock calls + a WhatsApp conversation. */
  @Post('mock/seed')
  async seed(@CurrentTenant() tenantId: string) {
    const [calls, whatsapp] = await Promise.all([
      this.mock.seedCalls(tenantId),
      this.mock.seedWhatsApp(tenantId),
    ]);
    return { calls, whatsapp };
  }
}
