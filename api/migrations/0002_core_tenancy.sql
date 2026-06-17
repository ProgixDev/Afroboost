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
