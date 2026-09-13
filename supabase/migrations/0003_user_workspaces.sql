-- QuoteReady · 0003_user_workspaces
-- Real accounts: profiles tied to auth.users, per-user organisations with
-- memberships, row-level security, enum guards and storage policies.
-- Safe to run on an existing database: every statement is idempotent.

-- ── profiles ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text,
  trade text,
  service_area text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_profiles_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- Auto-create a profile whenever a user signs up (any auth flow).
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── organisation membership ───────────────────────────────────────────────────
create table if not exists public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner', -- owner | dispatcher | technician
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);
create index if not exists idx_members_user on public.organisation_members (user_id);
create index if not exists idx_members_org on public.organisation_members (organisation_id);

-- ── enum guards (existing data already conforms) ──────────────────────────────
alter table public.jobs drop constraint if exists jobs_job_type_check;
alter table public.jobs add constraint jobs_job_type_check
  check (job_type in ('leaking_tap', 'toilet_repair', 'hot_water_system'));

alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in (
    'new', 'analysed', 'needs_information', 'inspection_recommended',
    'ready_for_estimate', 'follow_up_drafted', 'follow_up_approved',
    'inspection_requested', 'closed'
  ));

alter table public.jobs drop constraint if exists jobs_intake_channel_check;
alter table public.jobs add constraint jobs_intake_channel_check
  check (intake_channel in ('text', 'call', 'web_form', 'email', 'in_person'));

alter table public.job_evidence drop constraint if exists job_evidence_type_check;
alter table public.job_evidence add constraint job_evidence_type_check
  check (evidence_type in ('enquiry', 'image', 'voice_note', 'manual_note', 'customer_reply'));

alter table public.message_drafts drop constraint if exists message_drafts_type_check;
alter table public.message_drafts add constraint message_drafts_type_check
  check (message_type in ('request_information', 'inspection_recommended'));

alter table public.message_drafts drop constraint if exists message_drafts_status_check;
alter table public.message_drafts add constraint message_drafts_status_check
  check (status in ('draft', 'approved'));

alter table public.audit_events drop constraint if exists audit_events_actor_check;
alter table public.audit_events add constraint audit_events_actor_check
  check (actor_type in ('user', 'ai', 'system'));

alter table public.organisation_members drop constraint if exists organisation_members_role_check;
alter table public.organisation_members add constraint organisation_members_role_check
  check (role in ('owner', 'dispatcher', 'technician'));

-- Extra indexes for the dashboard/alerts feed.
create index if not exists idx_customers_org on public.customers (organisation_id);
create index if not exists idx_audit_recent on public.audit_events (created_at desc);
create index if not exists idx_drafts_status on public.message_drafts (status, created_at desc);

-- ── row-level security ────────────────────────────────────────────────────────
-- Helper: is the caller a member of the given organisation?
create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members m
    where m.organisation_id = org
      and m.user_id = auth.uid()
  );
$$;

-- Helper: is the caller a member of the org that owns this job?
create or replace function public.is_job_org_member(job uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.jobs j
    where j.id = job
      and public.is_org_member(j.organisation_id)
  );
$$;

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.job_evidence enable row level security;
alter table public.scope_versions enable row level security;
alter table public.message_drafts enable row level security;
alter table public.audit_events enable row level security;

-- profiles: strictly self-service
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (id = auth.uid());

-- organisations: members read their org; authenticated users may create one
drop policy if exists "member org read" on public.organisations;
create policy "member org read" on public.organisations
  for select using (public.is_org_member(id));
drop policy if exists "authenticated org create" on public.organisations;
create policy "authenticated org create" on public.organisations
  for insert to authenticated with check (true);

-- memberships: users see their own memberships; they may join an org they just created
drop policy if exists "own membership read" on public.organisation_members;
create policy "own membership read" on public.organisation_members
  for select using (user_id = auth.uid());
drop policy if exists "own membership insert" on public.organisation_members;
create policy "own membership insert" on public.organisation_members
  for insert to authenticated with check (user_id = auth.uid());

-- customers + jobs: scoped to the caller's organisation
drop policy if exists "org customers read" on public.customers;
create policy "org customers read" on public.customers
  for select using (public.is_org_member(organisation_id));
drop policy if exists "org customers write" on public.customers;
create policy "org customers write" on public.customers
  for insert with check (public.is_org_member(organisation_id));

drop policy if exists "org jobs read" on public.jobs;
create policy "org jobs read" on public.jobs
  for select using (public.is_org_member(organisation_id));
drop policy if exists "org jobs insert" on public.jobs;
create policy "org jobs insert" on public.jobs
  for insert with check (public.is_org_member(organisation_id));
drop policy if exists "org jobs update" on public.jobs;
create policy "org jobs update" on public.jobs
  for update using (public.is_org_member(organisation_id));
drop policy if exists "org jobs delete" on public.jobs;
create policy "org jobs delete" on public.jobs
  for delete using (public.is_org_member(organisation_id));

-- child rows of jobs: scoped through the parent job
drop policy if exists "org evidence read" on public.job_evidence;
create policy "org evidence read" on public.job_evidence
  for select using (public.is_job_org_member(job_id));
drop policy if exists "org evidence write" on public.job_evidence;
create policy "org evidence write" on public.job_evidence
  for insert with check (public.is_job_org_member(job_id));

drop policy if exists "org scopes read" on public.scope_versions;
create policy "org scopes read" on public.scope_versions
  for select using (public.is_job_org_member(job_id));
drop policy if exists "org scopes write" on public.scope_versions;
create policy "org scopes write" on public.scope_versions
  for insert with check (public.is_job_org_member(job_id));

drop policy if exists "org drafts read" on public.message_drafts;
create policy "org drafts read" on public.message_drafts
  for select using (public.is_job_org_member(job_id));
drop policy if exists "org drafts write" on public.message_drafts;
create policy "org drafts write" on public.message_drafts
  for insert with check (public.is_job_org_member(job_id));
drop policy if exists "org drafts update" on public.message_drafts;
create policy "org drafts update" on public.message_drafts
  for update using (public.is_job_org_member(job_id));

drop policy if exists "org audit read" on public.audit_events;
create policy "org audit read" on public.audit_events
  for select using (public.is_job_org_member(job_id));
drop policy if exists "org audit write" on public.audit_events;
create policy "org audit write" on public.audit_events
  for insert with check (public.is_job_org_member(job_id));

-- ── storage policies ──────────────────────────────────────────────────────────
drop policy if exists "authenticated upload job images" on storage.objects;
create policy "authenticated upload job images" on storage.objects
  for insert to authenticated with check (bucket_id = 'job-images');
drop policy if exists "authenticated upload voice notes" on storage.objects;
create policy "authenticated upload voice notes" on storage.objects
  for insert to authenticated with check (bucket_id = 'voice-notes');
