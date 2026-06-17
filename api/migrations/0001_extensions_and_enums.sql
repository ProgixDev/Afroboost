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
