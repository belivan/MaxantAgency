-- Prospects staging table for Command Center orchestrator
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  website text not null unique,
  company_name text,
  industry text,
  why_now text,
  teaser text,
  status text not null default 'pending_analysis',
  run_id uuid,
  source text,
  city text,
  brief_snapshot jsonb,
  last_status_change timestamptz
);

create index if not exists prospects_status_idx on public.prospects(status);
create index if not exists prospects_city_idx on public.prospects(city);

comment on table public.prospects is 'Stores raw prospects before full website analysis. Populated by client-orchestrator via Command Center.';
comment on column public.prospects.status is 'pending_analysis | queued | analyzed | error';

