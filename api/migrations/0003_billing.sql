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
