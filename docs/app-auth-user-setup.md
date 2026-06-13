# App Auth User Setup

## Purpose

This document describes how to prepare manually managed `app_login_users` rows
for the ID/password app-auth flow. It is for the June Supabase-mode path and
does not introduce SSO, Supabase Auth email/password, user-management UI, or
production backend permission enforcement.

Do not write real passwords, password hashes, service-role keys, or session
secrets into this repository.

## Schema

The schema is added by:

- `db/migrations/20260613002000_add_app_login_users.sql`

Expected table:

```sql
public.app_login_users (
  user_id uuid primary key default gen_random_uuid(),
  login_id text unique not null,
  display_name text not null,
  role_code text not null check (role_code in ('admin', 'sales', 'viewer')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Table separation:

- `public.app_users` is the existing auth/profile table with an `email` column.
  It is not used by the ID/password app-auth flow and must not be altered,
  dropped, renamed, or populated with pseudo email values for this purpose.
- `public.app_login_users` is the dedicated June ID/password app-auth table.
  It is `login_id` based and does not store or require email.

Security policy:

- RLS is enabled.
- No anon/authenticated frontend select policy is created.
- Vercel Functions query `app_login_users` with the server-only service role.
- `password_hash` is never sent to the frontend or stored in session payloads.

## Password Hash Generation

Generate hashes with the repository helper:

```powershell
$env:APP_USER_PASSWORD = "temporary-password-value"
node scripts/generateAppUserPasswordHash.mjs
Remove-Item Env:\APP_USER_PASSWORD
```

You can also run the script and type the password into the prompt:

```powershell
node scripts/generateAppUserPasswordHash.mjs
```

Do not pass the password as a CLI argument because it can be captured in shell
history or process lists. The helper prints only the `password_hash` value.

Hash format:

```text
pbkdf2$sha256$<iterations>$<salt>$<hash>
```

This is the same format verified by `api/auth/_utils.js`.

## Initial User Insert Template

Use placeholders only in source-controlled SQL. Replace hash placeholders only
inside Supabase SQL Editor or another secure server-side channel.

```sql
insert into public.app_login_users (login_id, display_name, role_code, password_hash)
values
  ('admin01', 'Administrator', 'admin', '<PASSWORD_HASH_FROM_SCRIPT>'),
  ('sales01', 'Sales User', 'sales', '<PASSWORD_HASH_FROM_SCRIPT>'),
  ('viewer01', 'Viewer User', 'viewer', '<PASSWORD_HASH_FROM_SCRIPT>')
on conflict (login_id) do update
set
  display_name = excluded.display_name,
  role_code = excluded.role_code,
  password_hash = excluded.password_hash,
  active = true,
  updated_at = now();
```

Initial role intent:

- `admin01`: admin operator.
- `sales01`: sales operator.
- `viewer01`: read-only operator.

## Vercel Environment Checklist

Frontend build-time env:

```env
VITE_AUTH_LOGIN_MODE=app
VITE_DATA_BACKEND=supabase
VITE_FEATURE_STANDARD_EFFORT=true
VITE_FEATURE_STANDARD_EFFORT_META=true
VITE_STANDARD_EFFORT_MODE=standard
```

Server-only env:

```env
APP_AUTH_SESSION_SECRET=<server-only-random-secret>
SUPABASE_URL=<server-only-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

Forbidden:

- Do not create `VITE_SUPABASE_SERVICE_ROLE_KEY`.
- Do not create `VITE_APP_AUTH_SESSION_SECRET`.
- Do not commit actual secret values.

## Login E2E Smoke

Run this only after the target Vercel runtime, server-only env, and
`app_login_users` rows are ready. Redeploy only during the Daily Release
window.

1. Apply the `app_login_users` schema.
2. Generate password hashes with `scripts/generateAppUserPasswordHash.mjs`.
3. Insert active `admin01`, `sales01`, and `viewer01` rows.
4. Configure Vercel env values.
5. Build/deploy during the Daily Release.
6. Open the deployed app with `VITE_AUTH_LOGIN_MODE=app`.
7. Confirm the login page shows user ID/password fields and no email wording.
8. Login as `admin01` and confirm the header shows `display_name` or
   `login_id`.
9. Logout and confirm the login page returns.
10. Login as `sales01` and verify the Phase 11-D sales UX rules.
11. Login as `viewer01` and verify the Phase 11-D viewer read-only UX rules.

Track the actual result in
[App Auth Login E2E Smoke Result](./app-auth-login-smoke-result.md).

Current Phase 11-BR-3 status:

- App-auth implementation and setup docs are ready.
- Real E2E smoke is `BLOCKED` until target `app_login_users` rows, Vercel env,
  and Daily Release deployment are ready.
- No real password, generated password hash, session secret, or service-role
  key has been recorded in source-controlled files.

## Rollback

Disable the login gate by rebuilding with:

```env
VITE_AUTH_LOGIN_MODE=disabled
```

This does not remove `app_login_users`; it only returns the frontend to the
existing no-login entry path.
