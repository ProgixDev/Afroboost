# AfroBoost API

NestJS (Fastify) backend for the AfroBoost platform — serves both the Expo
mobile app (business owners) and the Next.js super-admin console.

- **Framework:** NestJS 11 on Fastify
- **Data / Auth / Storage:** Supabase (Postgres, Auth, Storage)
- **Jobs / scheduling:** BullMQ on Redis
- **Tenant isolation:** app-layer (NestJS guards), service-role DB access
- **AI:** OpenAI (text + image); video generation is a mock service for now

See the full phased plan at `~/.claude/plans/i-want-you-to-quizzical-kurzweil.md`.

## Quick start

```bash
cd api
cp .env.example .env        # optional — the app boots with zero config
npm install
npm run start:dev
```

Then:

```bash
curl http://localhost:3333/health         # liveness  → 200
curl http://localhost:3333/health/ready   # readiness → integration status
```

The app boots with **zero configuration**: the Supabase and Redis clients
initialise lazily, so `/health` works before any secret is wired. Each route
requires only the env vars for the service it uses.

## Layout

```
src/
  config/      env validation
  supabase/    service-role client (lazy)
  queue/       BullMQ root config
  health/      liveness + readiness
  main.ts      Fastify bootstrap (global /api prefix, /health excluded)
migrations/    SQL migrations (source of truth; applied via Supabase MCP/CLI)
```

## Running the worker

BullMQ processors (generation, publish, weekly reports) run in-process in dev.
For production, run a dedicated worker and disable processors on the web dyno:

```bash
npm run build && npm run worker
```

## Seeding an admin

```bash
npm run build && npm run seed:admin -- you@afroboost.ca 'strongpass' 'Your Name' super_admin
```

## Status

All phase **code** is implemented and compiles; the app boots with zero config.
External integrations require their env vars, and the database requires the
migrations in `migrations/` to be applied (via Supabase MCP or CLI).

- ✅ Phase 0 — scaffold, config, health, BullMQ + Supabase wiring
- ✅ Phase 1 — schema migrations authored in `migrations/` (⏳ pending DB apply)
- ✅ Phase 2 — auth: Supabase JWT (owners), Prelude OTP, admin RBAC, tenant scoping
- ✅ Phase 3 — content CRUD + OpenAI generation (video = mock service)
- ✅ Phase 4 — Stripe billing (checkout, portal, webhooks)
- ✅ Phase 5 — Meta FB/IG publishing + scheduling + engagement backfill
- ✅ Phase 6 — Google reviews, Gmail email, CRM, inbox (calls/WhatsApp mocked)
- ✅ Phase 7 — admin ops, usage metering, metrics, audit, weekly reports
- ✅ Phase 8 — helmet, rate limiting, worker entrypoint
