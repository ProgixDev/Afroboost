import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePostDto, UpdatePostDto } from './dto';

const POST_FIELDS =
  'id, caption, media_url, channels, status, template, scheduled_at, published_at, engagement, created_at, updated_at';

@Injectable()
export class PostsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(tenantId: string, status?: string) {
    let query = this.supabase.admin
      .from('posts')
      .select(POST_FIELDS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    return data ?? [];
  }

  async get(tenantId: string, id: string) {
    const { data } = await this.supabase.admin
      .from('posts')
      .select(POST_FIELDS)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!data) throw new NotFoundException('Post not found');
    return data;
  }

  async create(tenantId: string, dto: CreatePostDto) {
    const { data } = await this.supabase.admin
      .from('posts')
      .insert({
        tenant_id: tenantId,
        caption: dto.caption,
        media_url: dto.mediaUrl ?? null,
        channels: dto.channels ?? [],
        template: dto.template ?? null,
        status: 'draft',
      })
      .select(POST_FIELDS)
      .single();
    return data;
  }

  async update(tenantId: string, id: string, dto: UpdatePostDto) {
    await this.get(tenantId, id); // tenant-scoped existence check
    const patch: Record<string, unknown> = {};
    if (dto.caption !== undefined) patch.caption = dto.caption;
    if (dto.mediaUrl !== undefined) patch.media_url = dto.mediaUrl;
    if (dto.channels !== undefined) patch.channels = dto.channels;
    if (dto.status !== undefined) patch.status = dto.status;

    const { data } = await this.supabase.admin
      .from('posts')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select(POST_FIELDS)
      .single();
    return data;
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.supabase.admin
      .from('posts')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    return { deleted: true };
  }
}
