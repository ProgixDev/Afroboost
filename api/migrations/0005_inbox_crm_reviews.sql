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
