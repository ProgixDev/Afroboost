import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE } from '../queue/queue.constants';
import { MetaService } from './meta.service';
import { PublishService } from './publish.service';
import { PublishProcessor } from './publish.processor';
import { MetaController } from './meta.controller';
import { PublishController } from './publish.controller';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.PUBLISH })],
  controllers: [MetaController, PublishController],
  providers: [MetaService, PublishService, PublishProcessor],
  exports: [MetaService, PublishService],
})
export class MetaModule {}
