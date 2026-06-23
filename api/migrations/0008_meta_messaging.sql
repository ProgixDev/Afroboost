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
