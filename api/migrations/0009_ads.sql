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
