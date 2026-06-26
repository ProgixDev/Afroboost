-- AfroBoost — combined schema migrations 0001–0009
-- Generated for one-shot apply via Supabase SQL Editor.
-- Run this once on project ref ygmlgqtjvmswqooyxewg.
begin;

-- ============================================================
-- 0001_extensions_and_enums.sql
-- ============================================================
-- 0001_extensions_and_enums.sql
-- Extensions, enum types (mirroring the frontend union types in
-- admin/src/lib/types.ts and src/types/index.ts), and shared helpers.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ── Enums ────────────────────────────────────────────────────────────────
-- Values mirror the frontend literals EXACTLY (incl. camelCase like
-- 'googleReview' / 'walkIn') so no transform is needed across the wire.

create type business_type   as enum ('restaurant', 'bar', 'grocery', 'solo');
create type plan            as enum ('decouverte', 'performance', 'premium');
create type tone            as enum ('warm', 'pro', 'casual', 'direct');
create type language        as enum ('fr', 'en', 'creole', 'lingala', 'soussou');
create type region          as enum ('Montréal', 'Laval', 'Longueuil', 'Québec', 'Gatineau');

create type provider        as enum (
  'facebook', 'instagram', 'google', 'whatsapp',
  'twilio', 'stripe', 'gmail', 'outlook', 'calendly'
);

create type tenant_status   as enum ('active', 'trialing', 'past_due', 'suspended', 'canceled');

create type admin_role      as enum ('super_admin', 'support', 'analyst', 'viewer');
create type admin_status    as enum ('active', 'invited', 'disabled');

create type invoice_status  as enum ('paid', 'open', 'void', 'refunded', 'failed');

create type audit_action    as enum (
  'login', 'suspend_tenant', 'reactivate_tenant', 'edit_tenant',
  'refund_invoice', 'impersonate', 'change_plan', 'invite_admin',
  'resolve_ticket', 'export_data'
);

create type ticket_status   as enum ('open', 'pending', 'resolved');
create type ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type ticket_channel  as enum ('email', 'chat', 'phone');

create type post_status      as enum ('draft', 'queued', 'scheduled', 'published', 'failed');

-- Multi-channel inbox (src/types Channel). Includes 'googleReview' verbatim.
create type channel          as enum (
  'phone', 'sms', 'whatsapp', 'instagram', 'facebook', 'googleReview', 'email'
);

create type message_author   as enum ('customer', 'business', 'ai');
create type customer_source  as enum ('phone', 'social', 'walkIn', 'referral', 'import');
create type call_handled_by  as enum ('ai', 'transferred');
create type review_status     as enum ('pending', 'approved', 'rejected');
create type notification_kind as enum ('post', 'call', 'review', 'customer', 'report');

create type generation_kind   as enum ('caption', 'image', 'video');
create type generation_status as enum ('queued', 'processing', 'completed', 'failed');
create type media_kind        as enum ('image', 'video');
create type media_source      as enum ('openai', 'mock');

-- ── Shared trigger: keep updated_at fresh ────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 0002_core_tenancy.sql
-- ============================================================
-- 0002_core_tenancy.sql
-- Tenants, owners, admin users, business profiles, connected accounts.
-- RLS is enabled deny-by-default on every table: the backend uses the
-- service-role key (which bypasses RLS), so no policies are required for it
-- to work, and nothing leaks even if the Data API is ever exposed.

-- ── tenants ──────────────────────────────────────────────────────────────
-- Operator-level view of a business (mirrors admin/src/lib/types Tenant).
-- owner_id FK is added after `owners` exists (circular reference).
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          business_type not null,
  region        region,
  address       text,
  owner_id      uuid,
  status        tenant_status not null default 'trialing',
  plan          plan not null default 'decouverte',
  tone          tone not null default 'warm',
  languages     language[] not null default array['fr']::language[],
  trial_ends_at timestamptz,
  mrr           numeric(12,2) not null default 0,
  health_score  int not null default 100 check (health_score between 0 and 100),
  logo_hue      int not null default 0,
  last_active_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_tenants_updated_at before update on tenants
  for each row execute function set_updated_at();
alter table tenants enable row level security;

-- ── owners ───────────────────────────────────────────────────────────────
-- Business owners (mobile app users). Linked to Supabase auth.users.
create table owners (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  phone         text,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_owners_tenant on owners(tenant_id);
create trigger trg_owners_updated_at before update on owners
  for each row execute function set_updated_at();
alter table owners enable row level security;

-- Now wire the tenant -> owner FK.
alter table tenants
  add constraint fk_tenants_owner
  foreign key (owner_id) references owners(id) on delete set null;

-- ── admin_users ──────────────────────────────────────────────────────────
-- Operator console accounts. Backend-managed auth (Argon2), NOT Supabase Auth.
create table admin_users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text,
  role          admin_role not null default 'viewer',
  status        admin_status not null default 'invited',
  last_active_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_admin_users_updated_at before update on admin_users
  for each row execute function set_updated_at();
alter table admin_users enable row level security;

-- ── business_profiles ────────────────────────────────────────────────────
-- Owner-editable richer settings (mirrors src/types Business). One per tenant.
create table business_profiles (
  tenant_id  uuid primary key references tenants(id) on delete cascade,
  hours      jsonb not null default '{}'::jsonb,   -- { mon..sun: "9-17" }
  services   text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);
create trigger trg_business_profiles_updated_at before update on business_profiles
  for each row execute function set_updated_at();
alter table business_profiles enable row level security;

-- ── connected_accounts ───────────────────────────────────────────────────
-- One row per (tenant, provider). Holds OAuth tokens — the heart of the
-- Meta / Google / email integrations.
-- NOTE: tokens are stored as text here; column-level encryption at rest is
-- defined in Phase 2 (see plan). Do not expose this table via the Data API.
create table connected_accounts (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  provider            provider not null,
  connected           boolean not null default true,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  scopes              text[] not null default array[]::text[],
  external_account_id text,
  external_account_name text,
  metadata            jsonb not null default '{}'::jsonb,
  connected_at        timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, provider)
);
create index idx_connected_accounts_tenant on connected_accounts(tenant_id);
create trigger trg_connected_accounts_updated_at before update on connected_accounts
  for each row execute function set_updated_at();
alter table connected_accounts enable row level security;

-- ============================================================
-- 0003_billing.sql
-- ============================================================
-- 0003_billing.sql
-- Plan config, subscriptions, invoices. Stripe ids added for Phase 4 sync.

-- ── plan_prices ──────────────────────────────────────────────────────────
-- Mirrors PLAN_PRICES in admin/src/lib/types.ts (CAD / month). Seeded in 0007.
create table plan_prices (
  plan        plan primary key,
  label       text not null,
  monthly_cad numeric(12,2) not null
);
alter table plan_prices enable row level security;

-- ── plan_limits ──────────────────────────────────────────────────────────
-- Per-plan quotas feeding usage enforcement (posts / calls / sms / ai).
create table plan_limits (
  plan        plan primary key,
  posts_limit int not null,
  calls_limit int not null,
  sms_limit   int not null,
  ai_limit    int not null
);
alter table plan_limits enable row level security;

-- ── subscriptions ────────────────────────────────────────────────────────
create table subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id) on delete cascade,
  plan                 plan not null,
  status               tenant_status not null default 'trialing',
  mrr                  numeric(12,2) not null default 0,
  seats                int not null default 1,
  started_at           timestamptz not null default now(),
  renews_at            timestamptz,
  trial_ends_at        timestamptz,
  canceled_at          timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_subscriptions_tenant on subscriptions(tenant_id);
create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();
alter table subscriptions enable row level security;

-- ── invoices ─────────────────────────────────────────────────────────────
create table invoices (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  number           text not null unique,
  amount           numeric(12,2) not null,
  status           invoice_status not null default 'open',
  plan             plan not null,
  issued_at        timestamptz not null default now(),
  paid_at          timestamptz,
  stripe_invoice_id text unique,
  created_at       timestamptz not null default now()
);
create index idx_invoices_tenant on invoices(tenant_id);
create index idx_invoices_status on invoices(status);
alter table invoices enable row level security;

-- ============================================================
-- 0004_content.sql
-- ============================================================
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

-- ============================================================
-- 0005_inbox_crm_reviews.sql
-- ============================================================
-- 0005_inbox_crm_reviews.sql
-- CRM customers, inbox conversations/messages, calls (mock-fed),
-- reviews (Google, real). Mirrors src/types.

-- ── customers ────────────────────────────────────────────────────────────
create table customers (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  name                text not null,
  phone               text,
  email               text,
  address             text,
  source              customer_source not null default 'phone',
  tags                text[] not null default array[]::text[],
  last_contact_channel channel,
  last_contact_at     timestamptz,
  notes               text,
  history             jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_customers_tenant on customers(tenant_id);
create trigger trg_customers_updated_at before update on customers
  for each row execute function set_updated_at();
alter table customers enable row level security;

-- ── conversations ────────────────────────────────────────────────────────
create table conversations (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  channel        channel not null,
  customer_id    uuid references customers(id) on delete set null,
  customer_name  text not null,
  avatar_seed    text,
  unread         int not null default 0,
  last_message   text,
  last_timestamp timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_conversations_tenant on conversations(tenant_id);
create trigger trg_conversations_updated_at before update on conversations
  for each row execute function set_updated_at();
alter table conversations enable row level security;

-- ── messages ─────────────────────────────────────────────────────────────
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  author          message_author not null,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_tenant on messages(tenant_id);
alter table messages enable row level security;

-- ── calls ────────────────────────────────────────────────────────────────
-- AI phone receptionist log. Mock-fed initially; real Twilio later.
create table calls (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  caller       text,
  number       text,
  duration_sec int not null default 0,
  intent       text,
  handled_by   call_handled_by not null default 'ai',
  transcript   text[],
  created_at   timestamptz not null default now()
);
create index idx_calls_tenant on calls(tenant_id);
alter table calls enable row level security;

-- ── reviews ──────────────────────────────────────────────────────────────
-- Google Business reviews (real). AI drafts draft_reply.
create table reviews (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  author            text,
  rating            int not null check (rating between 1 and 5),
  snippet           text,
  draft_reply       text,
  status            review_status not null default 'pending',
  external_review_id text,
  reply_published_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tenant_id, external_review_id)
);
create index idx_reviews_tenant on reviews(tenant_id);
create trigger trg_reviews_updated_at before update on reviews
  for each row execute function set_updated_at();
alter table reviews enable row level security;

-- ============================================================
-- 0006_ops_and_admin.sql
-- ============================================================
-- 0006_ops_and_admin.sql
-- Usage metering, platform financials, audit log, support, notifications,
-- weekly decision reports.

-- ── usage_records ────────────────────────────────────────────────────────
-- Per-tenant consumption vs plan limits, per billing period.
create table usage_records (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  posts_used   int not null default 0,
  posts_limit  int not null default 0,
  calls_used   int not null default 0,
  calls_limit  int not null default 0,
  sms_used     int not null default 0,
  sms_limit    int not null default 0,
  ai_used      int not null default 0,
  ai_limit     int not null default 0,
  ai_cost      numeric(12,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, period_start)
);
create index idx_usage_records_tenant on usage_records(tenant_id);
create trigger trg_usage_records_updated_at before update on usage_records
  for each row execute function set_updated_at();
alter table usage_records enable row level security;

-- ── financial_months ─────────────────────────────────────────────────────
-- Platform-wide monthly financials (admin/src/lib/types FinancialMonth).
create table financial_months (
  month_iso       text primary key,          -- "2025-06"
  month           text not null,             -- "Jun"
  income          numeric(12,2) not null default 0,
  ai_cost         numeric(12,2) not null default 0,
  infra_cost      numeric(12,2) not null default 0,
  other_cost      numeric(12,2) not null default 0,
  new_tenants     int not null default 0,
  churned_tenants int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_financial_months_updated_at before update on financial_months
  for each row execute function set_updated_at();
alter table financial_months enable row level security;

-- ── audit_logs ───────────────────────────────────────────────────────────
create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor         text not null,
  actor_admin_id uuid references admin_users(id) on delete set null,
  action        audit_action not null,
  target        text,
  detail        text,
  ip            text,
  created_at    timestamptz not null default now()
);
create index idx_audit_logs_created_at on audit_logs(created_at desc);
alter table audit_logs enable row level security;

-- ── support_tickets ──────────────────────────────────────────────────────
create table support_tickets (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references tenants(id) on delete set null,
  subject    text not null,
  requester  text,
  status     ticket_status not null default 'open',
  priority   ticket_priority not null default 'normal',
  channel    ticket_channel not null default 'email',
  assignee   text,
  preview    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_support_tickets_status on support_tickets(status);
create trigger trg_support_tickets_updated_at before update on support_tickets
  for each row execute function set_updated_at();
alter table support_tickets enable row level security;

-- ── notifications ────────────────────────────────────────────────────────
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  title      text not null,
  body       text,
  kind       notification_kind not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_tenant on notifications(tenant_id, read);
alter table notifications enable row level security;

-- ── decision_reports ─────────────────────────────────────────────────────
-- Weekly AI-generated summaries (src/types DecisionReport).
create table decision_reports (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  week_start date not null,
  week_end   date not null,
  trend      jsonb not null default '{}'::jsonb,   -- { summary, series[] }
  wins       text[] not null default array[]::text[],
  issues     text[] not null default array[]::text[],
  actions    jsonb not null default '[]'::jsonb,    -- [{ id, text, done }]
  created_at timestamptz not null default now(),
  unique (tenant_id, week_start)
);
create index idx_decision_reports_tenant on decision_reports(tenant_id);
alter table decision_reports enable row level security;

-- ============================================================
-- 0007_seed.sql
-- ============================================================
-- 0007_seed.sql
-- Reference config (plan prices/limits) + a deterministic dev tenant/owner
-- for local testing. Idempotent. The dev admin password is set later by the
-- backend (Argon2 hash) in Phase 2, so admin_users is not seeded here.

-- ── Plan prices (PLAN_PRICES, CAD/month) ─────────────────────────────────
insert into plan_prices (plan, label, monthly_cad) values
  ('decouverte',  'Découverte',  47),
  ('performance', 'Performance', 97),
  ('premium',     'Premium',     197)
on conflict (plan) do update
  set label = excluded.label, monthly_cad = excluded.monthly_cad;

-- ── Plan limits (posts / calls / sms / ai per period) ────────────────────
insert into plan_limits (plan, posts_limit, calls_limit, sms_limit, ai_limit) values
  ('decouverte',   30,  100,  200,   50),
  ('performance', 100,  500, 1000,  300),
  ('premium',     500, 2000, 5000, 1500)
on conflict (plan) do update set
  posts_limit = excluded.posts_limit,
  calls_limit = excluded.calls_limit,
  sms_limit   = excluded.sms_limit,
  ai_limit    = excluded.ai_limit;

-- ── Dev tenant + owner (local testing only) ──────────────────────────────
insert into tenants (id, name, type, region, address, status, plan, tone, languages, mrr, health_score)
values (
  '00000000-0000-0000-0000-000000000001',
  'Le Coin Créole (dev)', 'restaurant', 'Montréal',
  '123 Rue Saint-Denis, Montréal', 'active', 'performance', 'warm',
  array['fr','en']::language[], 97, 88
)
on conflict (id) do nothing;

insert into owners (id, tenant_id, name, email, phone, email_verified)
values (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Patrick Dev', 'owner@afroboost.dev', '+15145550101', true
)
on conflict (id) do nothing;

update tenants
  set owner_id = '00000000-0000-0000-0000-000000000011'
  where id = '00000000-0000-0000-0000-000000000001' and owner_id is null;

insert into business_profiles (tenant_id, hours, services)
values (
  '00000000-0000-0000-0000-000000000001',
  '{"mon":"11-22","tue":"11-22","wed":"11-22","thu":"11-23","fri":"11-23","sat":"12-23","sun":"12-21"}'::jsonb,
  array['Dine-in','Takeout','Catering']
)
on conflict (tenant_id) do nothing;

insert into subscriptions (id, tenant_id, plan, status, mrr, seats, renews_at)
values (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001', 'performance', 'active', 97, 1,
  now() + interval '30 days'
)
on conflict (id) do nothing;

-- ============================================================
-- 0008_meta_messaging.sql
-- ============================================================
-- 0008_meta_messaging.sql
-- Real Facebook Messenger + Instagram Direct messaging into the unified inbox.
-- Extends conversations/messages (from 0005) with the external identifiers and
-- timestamps needed to thread, dedupe, and enforce Meta's 24-hour reply window.

-- ── conversations: thread identity + reply-window tracking ─────────────────
-- external_thread_id holds the page-scoped sender id: a Messenger PSID or an
-- Instagram IGSID. last_inbound_at is the timestamp of the most recent message
-- FROM the customer; the publish/reply path uses it to pick the messaging tag.
alter table conversations
  add column external_thread_id text,
  add column last_inbound_at    timestamptz;

-- One open thread per (tenant, channel, sender). Partial so legacy/mock rows
-- with a null external_thread_id are unaffected.
create unique index uq_conversations_external_thread
  on conversations(tenant_id, channel, external_thread_id)
  where external_thread_id is not null;

-- ── messages: external id (dedupe) + direction ────────────────────────────
-- Meta delivers each message with a stable mid; webhooks can be redelivered,
-- so we dedupe on it. direction is derived but stored for cheap filtering.
alter table messages
  add column external_message_id text,
  add column direction           text not null default 'out'
    check (direction in ('in', 'out'));

create unique index uq_messages_external_message_id
  on messages(external_message_id)
  where external_message_id is not null;

-- ── connected_accounts: fast reverse lookup by page/IG id ──────────────────
-- Webhooks arrive keyed by page id (FB) or IG account id (IG) with no tenant
-- context; this index makes resolving the owning tenant a point lookup.
create index idx_connected_accounts_external
  on connected_accounts(provider, external_account_id)
  where external_account_id is not null;

-- ============================================================
-- 0009_ads.sql
-- ============================================================
-- 0009_ads.sql
-- Meta Ads (Marketing API) campaign manager. Meta remains the source of truth;
-- these tables are a lightweight local mirror (for listing/UX without a round
-- trip) plus a date-bucketed insights cache. Budgets are stored in minor units
-- (cents), matching the Graph API.

-- ── ad_campaigns ───────────────────────────────────────────────────────────
create table ad_campaigns (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  external_id     text not null,                 -- Meta campaign id
  name            text not null,
  objective       text not null,
  status          text not null default 'PAUSED',
  daily_budget    bigint,                         -- cents; null when set at ad-set level
  lifetime_budget bigint,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, external_id)
);
create index idx_ad_campaigns_tenant on ad_campaigns(tenant_id);
create trigger trg_ad_campaigns_updated_at before update on ad_campaigns
  for each row execute function set_updated_at();
alter table ad_campaigns enable row level security;

-- ── ad_sets ────────────────────────────────────────────────────────────────
create table ad_sets (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  campaign_id       uuid not null references ad_campaigns(id) on delete cascade,
  external_id       text not null,
  name              text not null,
  status            text not null default 'PAUSED',
  daily_budget      bigint,
  optimization_goal text,
  billing_event     text,
  targeting         jsonb not null default '{}'::jsonb,
  start_time        timestamptz,
  end_time          timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tenant_id, external_id)
);
create index idx_ad_sets_tenant on ad_sets(tenant_id);
create index idx_ad_sets_campaign on ad_sets(campaign_id);
create trigger trg_ad_sets_updated_at before update on ad_sets
  for each row execute function set_updated_at();
alter table ad_sets enable row level security;

-- ── ads ────────────────────────────────────────────────────────────────────
create table ads (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  adset_id    uuid not null references ad_sets(id) on delete cascade,
  external_id text not null,
  name        text not null,
  status      text not null default 'PAUSED',
  -- Optional link to the source post (ads can promote an existing page post).
  post_id     uuid references posts(id) on delete set null,
  creative    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, external_id)
);
create index idx_ads_tenant on ads(tenant_id);
create index idx_ads_adset on ads(adset_id);
create trigger trg_ads_updated_at before update on ads
  for each row execute function set_updated_at();
alter table ads enable row level security;

-- ── ad_insights ────────────────────────────────────────────────────────────
-- Per-object, per-day performance cache. Refreshed on demand from the Graph
-- API; one row per (object, day) so re-syncs upsert cleanly.
create table ad_insights (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  level       text not null check (level in ('account', 'campaign', 'adset', 'ad')),
  external_id text not null,                       -- the Meta object id
  date        date not null,
  spend       numeric not null default 0,          -- account currency, major units
  impressions bigint  not null default 0,
  reach       bigint  not null default 0,
  clicks      bigint  not null default 0,
  ctr         numeric not null default 0,
  cpc         numeric not null default 0,
  conversions bigint  not null default 0,
  roas        numeric not null default 0,
  created_at  timestamptz not null default now(),
  unique (tenant_id, level, external_id, date)
);
create index idx_ad_insights_tenant on ad_insights(tenant_id, level, date);
alter table ad_insights enable row level security;

commit;
