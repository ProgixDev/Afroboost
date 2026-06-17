import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';
import { QUEUE } from '../queue/queue.constants';
import { GenerateContentDto } from './dto';

export interface GenerationJobData {
  jobId: string;
  tenantId: string;
}

@Injectable()
export class GenerationService {
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue(QUEUE.GENERATION) private readonly queue: Queue,
  ) {}

  /** Create a generation job row and enqueue it for async processing. */
  async enqueue(tenantId: string, dto: GenerateContentDto) {
    const kind = dto.media ?? 'image';
    const { data: job, error } = await this.supabase.admin
      .from('generation_jobs')
      .insert({
        tenant_id: tenantId,
        kind,
        provider: kind === 'video' ? 'mock' : 'openai',
        status: 'queued',
        input: {
          prompt: dto.prompt,
          tone: dto.tone,
          template: dto.template,
          channels: dto.channels ?? [],
          createDraft: dto.createDraft ?? true,
        },
      })
      .select('id, status, kind')
      .single();
    if (error || !job) {
      throw new BadRequestException(error?.message ?? 'Could not create job');
    }

    await this.queue.add(
      'generate',
      { jobId: job.id, tenantId } satisfies GenerationJobData,
      { jobId: job.id },
    );
    return { jobId: job.id, status: job.status, kind: job.kind };
  }

  async getJob(tenantId: string, jobId: string) {
    const { data } = await this.supabase.admin
      .from('generation_jobs')
      .select('id, kind, provider, status, output, error, created_at, updated_at')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Generation job not found');
    return data;
  }
}
