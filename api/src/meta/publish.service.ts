import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';
import { QUEUE } from '../queue/queue.constants';
import { UsageService } from '../usage/usage.service';
import { MetaService } from './meta.service';

export interface PublishJobData {
  tenantId: string;
  postId: string;
}

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly meta: MetaService,
    private readonly usage: UsageService,
    @InjectQueue(QUEUE.PUBLISH) private readonly queue: Queue,
  ) {}

  /** Schedule a post for future publishing via a delayed BullMQ job. */
  async schedule(tenantId: string, postId: string, scheduledAt: string) {
    const post = await this.load(tenantId, postId);
    const when = new Date(scheduledAt).getTime();
    const delay = Math.max(0, when - Date.now());

    await this.supabase.admin
      .from('posts')
      .update({ status: 'scheduled', scheduled_at: scheduledAt })
      .eq('tenant_id', tenantId)
      .eq('id', postId);

    await this.queue.add(
      'publish',
      { tenantId, postId } satisfies PublishJobData,
      { delay, jobId: `publish:${postId}` },
    );
    return { id: post.id, status: 'scheduled', scheduledAt };
  }

  /** Publish a post now to all its channels and record external ids. */
  async publishNow(tenantId: string, postId: string) {
    const post = await this.load(tenantId, postId);
    const channels: string[] = post.channels ?? [];
    if (channels.length === 0) {
      throw new BadRequestException('Post has no channels');
    }

    const externalIds: Record<string, string> = {};
    try {
      for (const channel of channels) {
        if (channel === 'facebook') {
          externalIds.facebook = await this.meta.publishFacebook(tenantId, {
            caption: post.caption,
            mediaUrl: post.media_url,
          });
        } else if (channel === 'instagram') {
          externalIds.instagram = await this.meta.publishInstagram(tenantId, {
            caption: post.caption,
            mediaUrl: post.media_url,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'publish failed';
      await this.supabase.admin
        .from('posts')
        .update({ status: 'failed' })
        .eq('tenant_id', tenantId)
        .eq('id', postId);
      this.logger.error(`Publish failed for post ${postId}: ${message}`);
      throw err;
    }

    await this.supabase.admin
      .from('posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        external_post_ids: externalIds,
      })
      .eq('tenant_id', tenantId)
      .eq('id', postId);

    await this.usage.increment(tenantId, 'posts', 1);

    // Backfill engagement a bit later, once the post has had time to gather some.
    await this.queue.add(
      'engagement',
      { tenantId, postId } satisfies PublishJobData,
      { delay: 60 * 60 * 1000, jobId: `engagement:${postId}` },
    );

    return { id: postId, status: 'published', externalIds };
  }

  /** Pull current likes/comments/reach for a published post. */
  async backfillEngagement(tenantId: string, postId: string) {
    const post = await this.load(tenantId, postId);
    const ids = (post.external_post_ids ?? {}) as Record<string, string>;
    const totals = { likes: 0, comments: 0, reach: 0 };
    for (const channel of ['facebook', 'instagram'] as const) {
      if (!ids[channel]) continue;
      const e = await this.meta.getEngagement(tenantId, channel, ids[channel]);
      totals.likes += e.likes;
      totals.comments += e.comments;
      totals.reach += e.reach;
    }
    await this.supabase.admin
      .from('posts')
      .update({ engagement: totals })
      .eq('tenant_id', tenantId)
      .eq('id', postId);
    return totals;
  }

  private async load(tenantId: string, postId: string) {
    const { data } = await this.supabase.admin
      .from('posts')
      .select('id, caption, media_url, channels, status, external_post_ids')
      .eq('tenant_id', tenantId)
      .eq('id', postId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Post not found');
    return data;
  }
}
