-- App-managed ID/password authentication users for the June Supabase-mode path.
-- This table is intentionally separate from the existing public.app_users
-- profile/auth table, which has an email column and is not used by app auth.
-- Real users are inserted manually through Supabase SQL Editor or another
-- server-side secure channel. Do not commit real password hashes.

create table if not exists public.app_login_users (
  user_id uuid primary key default gen_random_uuid(),
  login_id text unique not null,
  display_name text not null,
  role_code text not null check (role_code in ('admin', 'sales', 'viewer')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_login_users_login_id_lower_idx
  on public.app_login_users (lower(login_id));

create index if not exists app_login_users_active_login_lookup_idx
  on public.app_login_users (active, lower(login_id));

alter table public.app_login_users enable row level security;

-- Intentionally no anon/authenticated RLS policies.
-- Vercel Functions must read this table with the server-only service role.

comment on table public.app_login_users is
  'App-managed login users for Vercel Function ID/password auth.';
comment on column public.app_login_users.password_hash is
  'PBKDF2 hash only. Plaintext passwords must never be stored.';
