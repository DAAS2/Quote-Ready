-- QuoteReady · 0005_quotes
-- Customer-facing quotes. A quote belongs to a job and stores the full
-- QuoteDocument (the same Zod-validated model the docx/pdf renderers consume)
-- plus the computed totals so list views never have to recompute money.
-- Idempotent: safe to re-run.

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  quote_number text not null,
  status text not null default 'draft',
  document jsonb not null,          -- full QuoteDocument (see lib/quotes/schema.ts)
  subtotal_cents integer not null default 0,
  gst_cents integer not null default 0,
  total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, quote_number)
);
create index if not exists idx_quotes_job on public.quotes (job_id, created_at desc);
create index if not exists idx_quotes_org on public.quotes (organisation_id, created_at desc);

-- ── enum guard ──────────────────────────────────────────────────────────────
alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes add constraint quotes_status_check
  check (status in ('draft', 'issued', 'accepted', 'declined', 'expired'));

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.set_quotes_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_quotes_updated_at on public.quotes;
create trigger trg_quotes_updated_at before update on public.quotes
  for each row execute function public.set_quotes_updated_at();

-- ── row-level security (org-scoped, mirrors the rest of the workspace) ──────
alter table public.quotes enable row level security;

drop policy if exists "org quotes read" on public.quotes;
create policy "org quotes read" on public.quotes
  for select using (public.is_org_member(organisation_id));
drop policy if exists "org quotes insert" on public.quotes;
create policy "org quotes insert" on public.quotes
  for insert with check (public.is_org_member(organisation_id));
drop policy if exists "org quotes update" on public.quotes;
create policy "org quotes update" on public.quotes
  for update using (public.is_org_member(organisation_id));
drop policy if exists "org quotes delete" on public.quotes;
create policy "org quotes delete" on public.quotes
  for delete using (public.is_org_member(organisation_id));
