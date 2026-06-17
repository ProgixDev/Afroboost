# Database migrations

SQL migrations for the AfroBoost Supabase Postgres database (project ref
`ygmlgqtjvmswqooyxewg`). **These `.sql` files are the source of truth** for the
schema; the Supabase MCP server (or the Supabase CLI) is only the *applier*.

## Naming

`NNNN_short_description.sql` — zero-padded, monotonically increasing, one
migration per domain group. Never renumber an applied migration.

## Conventions (from the Supabase + Postgres skills)

- snake_case table and column names.
- Every tenant-owned table has a `tenant_id uuid not null references tenants(id)`.
- `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`.
- **RLS enabled, deny-by-default** on every table as defense-in-depth. The
  backend uses the service-role key (which bypasses RLS), so no policies are
  needed for it to work; the deny-by-default ensures nothing leaks even if the
  Data API is ever exposed. Owner/admin direct-access policies are added only
  if/when a table is intentionally exposed.
- Enums mirror the frontend union types in `admin/src/lib/types.ts` and
  `src/types/index.ts`.

## Applying

**Preferred — Supabase MCP** (once authenticated): iterate with `execute_sql`,
then commit the final SQL here.

**Alternative — Supabase CLI:**

```bash
supabase login                       # or export SUPABASE_ACCESS_TOKEN
supabase link --project-ref ygmlgqtjvmswqooyxewg
supabase db push                     # applies migrations
```

> Until MCP is authenticated (or the CLI is installed + linked), these files
> are authored but **not yet applied** to the live database.
