import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../storage/storage.service';
import { QUEUE } from '../queue/queue.constants';
import { OpenAiService } from '../ai/openai.service';
import { UsageService } from '../usage/usage.service';
import { MockVideoService } from './mock-video.service';
import { GenerationJobData } from './generation.service';

@Processor(QUEUE.GENERATION)
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
    private readonly openai: OpenAiService,
    private readonly mockVideo: MockVideoService,
    private readonly usage: UsageService,
  ) {
    super();
  }

  /** Prevents an unreachable Redis from crashing the process (dev DX). */
  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.debug(`generation worker: ${err.message}`);
  }

  async process(job: Job<GenerationJobData>): Promise<void> {
    const { jobId, tenantId } = job.data;
    const db = this.supabase.admin;

    const { data: row } = await db
      .from('generation_jobs')
      .select('id, kind, input')
      .eq('id', jobId)
      .single();
    if (!row) throw new Error(`Generation job ${jobId} not found`);

    await db
      .from('generation_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    try {
      const input = row.input as {
        prompt: string;
        tone?: string;
        template?: string;
        channels?: string[];
        createDraft?: boolean;
      };

      const { data: tenant } = await db
        .from('tenants')
        .select('name, languages')
        .eq('id', tenantId)
        .single();

      // 1. Caption (always, via OpenAI text).
      const caption = await this.openai.generateCaption({
        prompt: input.prompt,
        tone: input.tone,
        businessName: tenant?.name,
        language: tenant?.languages?.[0] ?? 'fr',
      });

      // 2. Media — real image via OpenAI, or MOCK video.
      let mediaUrl: string | null = null;
      let storagePath: string | null = null;
      const source = row.kind === 'video' ? 'mock' : 'openai';

      if (row.kind === 'video') {
        const result = await this.mockVideo.generate(input.prompt);
        mediaUrl = result.url;
      } else {
        const img = await this.openai.generateImage(input.prompt);
        const uploaded = await this.storage.upload(
          tenantId,
          `${jobId}.png`,
          img.buffer,
          img.contentType,
        );
        mediaUrl = uploaded.url;
        storagePath = uploaded.path;
      }

      const { data: asset } = await db
        .from('media_assets')
        .insert({
          tenant_id: tenantId,
          kind: row.kind === 'video' ? 'video' : 'image',
          source,
          url: mediaUrl,
          storage_path: storagePath,
          prompt: input.prompt,
        })
        .select('id')
        .single();

      // 3. Optional draft post linked to this generation.
      let postId: string | null = null;
      if (input.createDraft !== false) {
        const { data: post } = await db
          .from('posts')
          .insert({
            tenant_id: tenantId,
            caption,
            media_url: mediaUrl,
            channels: input.channels ?? [],
            template: input.template ?? null,
            status: 'draft',
            generation_job_id: jobId,
          })
          .select('id')
          .single();
        postId = post?.id ?? null;
        if (asset?.id && postId) {
          await db.from('media_assets').update({ post_id: postId }).eq('id', asset.id);
        }
      }

      await db
        .from('generation_jobs')
        .update({
          status: 'completed',
          output: { caption, mediaUrl, mediaAssetId: asset?.id, postId },
        })
        .eq('id', jobId);

      // Meter AI usage (rough per-generation cost estimate in CAD).
      await this.usage.increment(tenantId, 'ai', 1, row.kind === 'video' ? 0 : 0.05);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Generation job ${jobId} failed: ${message}`);
      await db
        .from('generation_jobs')
        .update({ status: 'failed', error: message })
        .eq('id', jobId);
      throw err;
    }
  }
}
