import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE } from '../queue/queue.constants';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { GenerationProcessor } from './generation.processor';
import { MockVideoService } from './mock-video.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.GENERATION })],
  controllers: [GenerationController],
  providers: [GenerationService, GenerationProcessor, MockVideoService],
  exports: [GenerationService],
})
export class GenerationModule {}
