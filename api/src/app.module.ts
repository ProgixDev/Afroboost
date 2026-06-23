import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { SupabaseModule } from './supabase/supabase.module';
import { QueueModule } from './queue/queue.module';
import { CommonModule } from './common/common.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { PostsModule } from './posts/posts.module';
import { GenerationModule } from './generation/generation.module';
import { BillingModule } from './billing/billing.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MetaModule } from './meta/meta.module';
import { AdsModule } from './ads/ads.module';
import { AiModule } from './ai/ai.module';
import { GoogleModule } from './google/google.module';
import { CrmModule } from './crm/crm.module';
import { ReviewsModule } from './reviews/reviews.module';
import { InboxModule } from './inbox/inbox.module';
import { AuditModule } from './audit/audit.module';
import { UsageModule } from './usage/usage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    QueueModule,
    CommonModule,
    StorageModule,
    AiModule,
    IntegrationsModule,
    GoogleModule,
    AuditModule,
    UsageModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    PostsModule,
    GenerationModule,
    BillingModule,
    MetaModule,
    AdsModule,
    CrmModule,
    ReviewsModule,
    InboxModule,
    AdminModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
