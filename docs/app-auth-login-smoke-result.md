# App Auth Login E2E Smoke Result

## Purpose

This document tracks the ID/password app-auth E2E smoke for
`VITE_AUTH_LOGIN_MODE=app`.

The smoke is intentionally separated from code implementation because it
requires target-environment Supabase schema, manually prepared users, Vercel
server-only environment variables, and a Daily Release deployment.

## Current Status

Status: `BLOCKED`

Reason:

- The smoke requires target Supabase `app_login_users` rows.
- The smoke requires server-only Vercel env values.
- The smoke requires a Daily Release deployment with
  `VITE_AUTH_LOGIN_MODE=app`.
- This phase does not perform commit, push, tag, or Vercel redeploy.

No real password, password hash, `APP_AUTH_SESSION_SECRET`, or
`SUPABASE_SERVICE_ROLE_KEY` is recorded in this document.

## Scope

In scope for this smoke:

- Confirm `app_login_users` schema exists.
- Confirm RLS is enabled and no frontend read policy is required.
- Confirm `admin01`, `sales01`, and `viewer01` active rows exist.
- Confirm Vercel frontend and server-only env values are present.
- Confirm app-mode login UI and role-based UX behavior after deployment.

Out of scope:

- User management UI.
- Permission management UI.
- Audit actor enhancement.
- Tomcat backend implementation.
- Internal DB cutover.
- Vercel redeploy outside the Daily Release window.

## SQL Verification Checklist

Run in Supabase SQL Editor.

### Table

```sql
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'app_login_users';
```

Result: `PENDING`

### Columns

```sql
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'app_login_users'
order by ordinal_position;
```

Expected columns:

- `user_id`
- `login_id`
- `display_name`
- `role_code`
- `password_hash`
- `active`
- `created_at`
- `updated_at`

Result: `PENDING`

### RLS

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'app_login_users';
```

Expected: `rowsecurity = true`

Result: `PENDING`

### Initial Users

Do not select or document `password_hash`.

```sql
select
  login_id,
  display_name,
  role_code,
  active,
  created_at,
  updated_at
from public.app_login_users
order by login_id;
```

Expected rows:

- `admin01` / admin / active
- `sales01` / sales / active
- `viewer01` / viewer / active

Result: `PENDING`

## Vercel Env Checklist

Frontend build-time env:

- `VITE_AUTH_LOGIN_MODE=app`
- `VITE_DATA_BACKEND=supabase`
- `VITE_FEATURE_STANDARD_EFFORT=true`
- `VITE_FEATURE_STANDARD_EFFORT_META=true`
- `VITE_STANDARD_EFFORT_MODE=standard`

Server-only env:

- `APP_AUTH_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Result: `PENDING`

Security notes:

- Do not create `VITE_APP_AUTH_SESSION_SECRET`.
- Do not create `VITE_SUPABASE_SERVICE_ROLE_KEY`.
- Do not record actual values in docs, code, commit messages, tickets, or chat.

## Login UI Smoke

Run after Daily Release deployment.

Expected:

- Logout or clear app auth cookie.
- App opens the full-screen login page.
- Sidebar, menu, and header are not visible.
- User ID input is visible.
- Password input is visible.
- Email wording is not visible.

Result: `PENDING`

## Role Smoke

### admin01

Expected:

- Login succeeds.
- Header shows display name or `admin01`.
- Standard Effort meta route is accessible.
- `actual_effort_mm` input is editable.
- Logout succeeds.

Result: `PENDING`

### sales01

Expected:

- Login succeeds.
- Standard Effort meta route is not accessible.
- Solution toggle is available.
- Item checkbox save is available.
- `actual_effort_mm` is disabled/read-only.
- Logout succeeds.

Result: `PENDING`

### viewer01

Expected:

- Login succeeds.
- Standard Effort meta route is not accessible.
- Solution, item, and actual effort save actions are unavailable.
- Read-only project/standard effort viewing works.
- Excel export follows the current viewer read policy.
- Logout succeeds.

Result: `PENDING`

## Overall Result

Current result: `BLOCKED`

The implementation and local tests are ready, but target-environment E2E smoke
is not complete until Supabase `app_login_users`, Vercel env, Daily Release
deploy, and browser role smoke are finished.
