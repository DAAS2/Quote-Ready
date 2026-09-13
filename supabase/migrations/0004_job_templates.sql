-- QuoteReady · 0004_job_templates
-- User-editable service templates. The deterministic engine (and the AI
-- grading that feeds it) runs against the organisation's own templates —
-- new enquiries can be filed under them.

create table if not exists public.job_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  base_type text not null check (base_type in ('leaking_tap', 'toilet_repair', 'hot_water_system')),
  name text not null,
  blurb text,
  document jsonb not null,          -- full JobTemplate-shaped document
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, name)
);
create index if not exists idx_templates_org on public.job_templates (organisation_id, base_type);

create or replace function public.set_job_templates_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_job_templates_updated_at on public.job_templates;
create trigger trg_job_templates_updated_at before update on public.job_templates
  for each row execute function public.set_job_templates_updated_at();

-- a job can be filed under a specific template
alter table public.jobs add column if not exists template_id uuid
  references public.job_templates(id) on delete set null;

-- RLS mirrors the rest of the workspace (org-scoped)
alter table public.job_templates enable row level security;

drop policy if exists "org templates read" on public.job_templates;
create policy "org templates read" on public.job_templates
  for select using (public.is_org_member(organisation_id));
drop policy if exists "org templates insert" on public.job_templates;
create policy "org templates insert" on public.job_templates
  for insert with check (public.is_org_member(organisation_id));
drop policy if exists "org templates update" on public.job_templates;
create policy "org templates update" on public.job_templates
  for update using (public.is_org_member(organisation_id));
drop policy if exists "org templates delete" on public.job_templates;
create policy "org templates delete" on public.job_templates
  for delete using (public.is_org_member(organisation_id));
