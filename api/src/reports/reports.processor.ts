import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE } from '../queue/queue.constants';
import { ReportsService } from './reports.service';

/** Generates weekly decision reports for all active tenants on a cron. */
@Processor(QUEUE.REPORTS)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(private readonly reports: ReportsService) {
    super();
  }

  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.debug(`reports worker: ${err.message}`);
  }

  async process(_job: Job): Promise<void> {
    await this.reports.generateForAll();
  }
}
