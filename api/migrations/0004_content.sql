-- 0004_content.sql
-- AI generation jobs, media assets, and posts (mirrors src/types Post).

-- ── generation_jobs ──────────────────────────────────────────────────────
-- Async AI generation tracking (BullMQ-backed). Video uses a mock provider.
create table generation_jobs (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  kind       generation_kind not null,
  provider   media_source,                 -- 'openai' | 'mock' (null for caption text)
  status     generation_status not null default 'queued',
  input      jsonb not null default '{}'::jsonb,   -- prompt, tone, template, channels
  output     jsonb,                                -- result refs (caption, media ids)
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_generation_jobs_tenant on generation_jobs(tenant_id);
create index idx_generation_jobs_status on generation_jobs(status);
create trigger trg_generation_jobs_updated_at before update on generation_jobs
  for each row execute function set_updated_at();
alter table generation_jobs enable row level security;

-- ── posts ────────────────────────────────────────────────────────────────
create table posts (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  caption           text not null default '',
  media_url         text,
  channels          channel[] not null default array[]::channel[], -- facebook/instagram
  status            post_status not null default 'draft',
  template          text,
  scheduled_at      timestamptz,
  published_at      timestamptz,
  engagement        jsonb,            -- { likes, comments, reach }
  generation_job_id uuid references generation_jobs(id) on delete set null,
  -- External publish ids per channel, e.g. { facebook: "...", instagram: "..." }
  external_post_ids jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_posts_tenant on posts(tenant_id);
create index idx_posts_status on posts(status);
create index idx_posts_scheduled_at on posts(scheduled_at) where status = 'scheduled';
create trigger trg_posts_updated_at before update on posts
  for each row execute function set_updated_at();
alter table posts enable row level security;

-- ── media_assets ─────────────────────────────────────────────────────────
-- Generated images/videos stored in Supabase Storage (bucket: media).
create table media_assets (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  post_id      uuid references posts(id) on delete set null,
  kind         media_kind not null,
  source       media_source not null,
  url          text,
  storage_path text,
  prompt       text,
  created_at   timestamptz not null default now()
);
create index idx_media_assets_tenant on media_assets(tenant_id);
alter table media_assets enable row level security;
