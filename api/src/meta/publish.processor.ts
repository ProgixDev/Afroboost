import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE } from '../queue/queue.constants';
import { PublishJobData, PublishService } from './publish.service';

/** Runs scheduled publishes and delayed engagement backfills. */
@Processor(QUEUE.PUBLISH)
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(private readonly publish: PublishService) {
    super();
  }

  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.debug(`publish worker: ${err.message}`);
  }

  async process(job: Job<PublishJobData>): Promise<void> {
    const { tenantId, postId } = job.data;
    if (job.name === 'engagement') {
      await this.publish.backfillEngagement(tenantId, postId);
      return;
    }
    await this.publish.publishNow(tenantId, postId);
  }
}
