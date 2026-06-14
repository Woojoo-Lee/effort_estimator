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

Result: `PARTIAL`

Phase 11-E-R row history smoke status:

| Path | Result | Evidence status |
| --- | --- | --- |
| `actual_effort_mm` save | `PASS` | `project_id=7`, WFM `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`, and `updated_by_login_id=admin01` confirmed through a join from `updated_by` to `app_login_users.user_id`. |
| Solution toggle save | `PENDING` | SQL/checklist prepared. Do not mark PASS until a real toggle/restore and `updated_by_login_id=admin01` are confirmed. |
| Item checkbox save | `PENDING` | SQL/checklist prepared. Do not mark PASS until a real check/uncheck/restore and `updated_by_login_id=admin01` are confirmed. |
| Meta base effort save/restore | `PENDING` | SQL/checklist prepared. Do not mark PASS until a real edit/restore and `updated_by_login_id=admin01` are confirmed. |
| Meta coefficient save/restore | `PENDING` | SQL/checklist prepared. Do not mark PASS until a real edit/restore and `updated_by_login_id=admin01` are confirmed. |
| Meta active toggle save/restore | `SKIP` | Optional smoke because it changes active visibility. Run only when a restore path is ready and record the restore result. |

SQL checklist for remaining row history smoke:

```sql
select
  s.project_id,
  s.solution_variant_id,
  s.enabled,
  s.updated_by,
  u.login_id as updated_by_login_id,
  u.display_name as updated_by_display_name,
  s.updated_at
from public.estimation_project_solution_selection s
left join public.app_login_users u
  on u.user_id = s.updated_by
where s.project_id = 7
order by s.updated_at desc
limit 10;
```

```sql
select
  i.project_id,
  i.solution_variant_id,
  i.item_id,
  i.checked,
  i.updated_by,
  u.login_id as updated_by_login_id,
  u.display_name as updated_by_display_name,
  i.updated_at
from public.estimation_project_item_solution_selection i
left join public.app_login_users u
  on u.user_id = i.updated_by
where i.project_id = 7
order by i.updated_at desc
limit 10;
```

```sql
select
  b.solution_variant_id,
  b.phase_code,
  b.phase_name,
  b.effort_mm,
  b.updated_by,
  u.login_id as updated_by_login_id,
  u.display_name as updated_by_display_name,
  b.updated_at
from public.estimation_standard_base_effort_meta b
left join public.app_login_users u
  on u.user_id = b.updated_by
where b.solution_variant_id = 'd3fd971f-505a-4829-b519-a379b40d034b'
order by b.updated_at desc
limit 10;
```

```sql
select
  c.item_id,
  c.solution_variant_id,
  c.coefficient,
  c.updated_by,
  u.login_id as updated_by_login_id,
  u.display_name as updated_by_display_name,
  c.updated_at
from public.estimation_item_solution_coefficient_meta c
left join public.app_login_users u
  on u.user_id = c.updated_by
where c.solution_variant_id = 'd3fd971f-505a-4829-b519-a379b40d034b'
order by c.updated_at desc
limit 10;
```

```sql
select
  v.solution_variant_id,
  v.display_name,
  v.active,
  v.updated_by,
  u.login_id as updated_by_login_id,
  v.updated_at
from public.estimation_solution_variant v
left join public.app_login_users u
  on u.user_id = v.updated_by
where v.solution_variant_id = 'd3fd971f-505a-4829-b519-a379b40d034b';
```

Notes:

- `updated_by` remains the UUID foreign/logical reference. Operator-readable
  verification uses joins to `app_login_users` for `login_id` and
  `display_name`.
- Do not record password hashes, plaintext passwords, cookies, service-role
  keys, or session secrets in this document.
- No detailed `app_audit_logs` event history is added for Phase 11-E-R.

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

## Row History Smoke

Run after app-mode login and role smoke can create real Supabase save events.

Expected:

- Standard Effort solution/item/actual effort saves write `updated_by` with the
  current session `user_id` when a user is logged in.
- Standard Effort meta base effort, coefficient, and active toggle saves write
  `updated_by` with the current session `user_id`.
- Insert-only fallback paths may write `created_by` and `updated_by`.
- Update/upsert paths do not overwrite `created_by` / `created_at`.
- No email, `login_id`, `display_name`, or password fields are written to
  business table row history columns.
- Detailed `app_audit_logs` event history is not part of Phase 11-E.

Result: `PENDING`

## Overall Result

Current result: `BLOCKED`

The implementation and local tests are ready, but target-environment E2E smoke
is not complete until Supabase `app_login_users`, Vercel env, Daily Release
deploy, and browser role smoke are finished.
