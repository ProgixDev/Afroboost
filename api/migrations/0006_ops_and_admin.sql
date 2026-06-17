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
