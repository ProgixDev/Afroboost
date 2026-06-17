import { Module } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { EmailService } from './email.service';
import { CallsService } from './calls.service';
import { MockFeederService } from './mock-feeder.service';
import { InboxController } from './inbox.controller';

@Module({
  controllers: [InboxController],
  providers: [InboxService, EmailService, CallsService, MockFeederService],
  exports: [InboxService, EmailService],
})
export class InboxModule {}
