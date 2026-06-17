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
