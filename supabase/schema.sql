-- Fortune Weaver — Supabase schema (single JSONB row model).
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table if not exists public.fw_state (
  id         int primary key default 1,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint fw_state_singleton check (id = 1)
);

-- Only the serverless functions (service-role key) touch this table, so lock out
-- direct client access. RLS on + no policies = deny all for anon/authenticated.
alter table public.fw_state enable row level security;

-- Storage: also create a PUBLIC bucket for images (dashboard → Storage → New
-- bucket → name "media", "Public bucket" ON). Public read lets fans see art;
-- uploads are gated because they go through the auth-checked /api/upload-url
-- function using the service-role key.
