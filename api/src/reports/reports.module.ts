import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE } from '../queue/queue.constants';
import { ReportsService } from './reports.service';
import { ReportsProcessor } from './reports.processor';
import { ReportsScheduler } from './reports.scheduler';
import { ReportsController } from './reports.controller';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.REPORTS })],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor, ReportsScheduler],
  exports: [ReportsService],
})
export class ReportsModule {}
