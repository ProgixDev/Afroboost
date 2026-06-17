import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const BUCKET = 'media';

/** Uploads generated media to Supabase Storage and returns a public URL. */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private bucketReady = false;

  constructor(private readonly supabase: SupabaseService) {}

  async upload(
    tenantId: string,
    fileName: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<{ path: string; url: string }> {
    await this.ensureBucket();
    const path = `${tenantId}/${fileName}`;
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, body, { contentType, upsert: true });
    if (error) throw error;

    const { data } = this.supabase.admin.storage.from(BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    const { error } = await this.supabase.admin.storage.createBucket(BUCKET, {
      public: true,
    });
    // "already exists" is fine; anything else we log but don't hard-fail on.
    if (error && !/exist/i.test(error.message)) {
      this.logger.warn(`createBucket(${BUCKET}): ${error.message}`);
    }
    this.bucketReady = true;
  }
}
