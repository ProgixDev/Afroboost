import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE } from '../queue/queue.constants';

/**
 * Registers the weekly report cron (Mondays 07:00 UTC). Registration is
 * idempotent — BullMQ dedupes repeatable jobs by their repeat options.
 * Connecting requires Redis; failures are logged, not fatal, so the app still
 * boots without Redis in dev.
 */
@Injectable()
export class ReportsScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReportsScheduler.name);

  constructor(@InjectQueue(QUEUE.REPORTS) private readonly queue: Queue) {}

  /**
   * Synchronous so Nest does not await it — otherwise `queue.add` would block
   * boot indefinitely when Redis is unreachable. The registration runs in the
   * background and completes once Redis is available.
   */
  onModuleInit(): void {
    // Handle producer-connection errors so an unreachable Redis logs (and
    // retries) instead of throwing an unhandled 'error' event.
    this.queue.on('error', (err) =>
      this.logger.debug(`reports queue: ${err.message}`),
    );
    void this.queue
      .add('weekly', {}, { repeat: { pattern: '0 7 * * 1' }, removeOnComplete: true })
      .then(() => this.logger.log('Weekly report cron registered'))
      .catch((err: Error) =>
        this.logger.warn(`Could not register weekly report cron: ${err.message}`),
      );
  }
}
