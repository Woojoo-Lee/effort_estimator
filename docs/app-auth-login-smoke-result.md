# App Auth Login E2E Smoke Result

## Purpose

This document tracks the ID/password app-auth E2E smoke for
`VITE_AUTH_LOGIN_MODE=app`.

The smoke is intentionally separated from code implementation because it
requires target-environment Supabase schema, manually prepared users, Vercel
server-only environment variables, and a Daily Release deployment.

## Current Status

Status: `PASS`

Reason:

- Local Vercel dev smoke passed with `VITE_AUTH_LOGIN_MODE=app`.
- `admin01`, `sales01`, and `viewer01` login/role smoke passed.
- Production Daily Release smoke remains a separate scheduled release gate.
- This phase does not perform commit, push, tag, or Vercel redeploy.

No real password, password hash, `APP_AUTH_SESSION_SECRET`, or
`SUPABASE_SERVICE_ROLE_KEY` is recorded in this document.

Phase 11-F sign-off update:

- `admin01`, `sales01`, and `viewer01` login and role smoke are confirmed for
  the feature branch sign-off.
- Phase 12-B-R local Vercel dev smoke is `PASS`.
- Row history smoke is PASS for `actual_effort_mm`, solution toggle, item
  checkbox, and meta coefficient.
- Meta base effort row history remains `PENDING`.
- Active toggle row history remains `SKIP`.
- Production Daily Release / Vercel deployment smoke is still governed by
  [Development And Release Policy](./development-release-policy.md).
- See [Auth, Permission, Row History Sign-Off](./auth-permission-row-history-signoff.md)
  for the June sign-off summary.

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

Note: local Vercel dev smoke confirms that the app can use
`app_login_users` based session and role data. RLS SQL verification remains a
separate checklist item below.

Phase 11-E-R row history smoke status:

| Path | Result | Evidence status |
| --- | --- | --- |
| `actual_effort_mm` save | `PASS` | `project_id=7`, WFM `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`, and `updated_by_login_id=admin01` confirmed through a join from `updated_by` to `app_login_users.user_id`. |
| Solution toggle save | `PASS` | Manual SQL join confirmed `updated_by_login_id=admin01`. The toggled value was restored. Exact row timestamp/id evidence was not captured, so this remains a manual SQL join confirmation rather than a row-level evidence capture. |
| Item checkbox save | `PASS` | `project_id=7`, WFM `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`, `item_id=ffcd0c35-4c8f-4040-9942-0ec1f7e9fb5c`, `checked=true`, `updated_at=2026-06-14 08:18:00.148+00`, `updated_by_login_id=sales01`, and `updated_by_display_name=영업대표` confirmed through a join from `updated_by` to `app_login_users.user_id`. Restore status: restore confirmation needed if the checked state must return to the pre-smoke value. |
| Meta base effort save/restore | `PENDING` | SQL/checklist prepared. Do not mark PASS until a real edit/restore and `updated_by_login_id=admin01` are confirmed. |
| Meta coefficient save/restore | `PASS` | Manual browser smoke in Standard Effort meta > item/coefficient tab changed and saved a coefficient while logged in as `admin01`; SQL join confirmed `updated_by_login_id=admin01`. The value was restored. Exact row timestamp/id evidence was not captured, so this remains a manual SQL join confirmation rather than a row-level evidence capture. |
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

Result: `PARTIAL`

Confirmed:

- `actual_effort_mm` save row history: `PASS`.
- Solution toggle row history: `PASS`.
- Item checkbox save row history: `PASS`.
- Meta coefficient row history: `PASS`.

Pending or skipped:

- Meta base effort row history is still `PENDING`.
- Meta active toggle row history remains `SKIP` unless a safe restore smoke is
  performed.

The item checkbox smoke used `sales01` and verified operator-readable identity
through an `app_login_users` join. `updated_by` remains the UUID `user_id`;
`login_id` and `display_name` are not denormalized into the business table.
Detailed `app_audit_logs`, `before_json`, and `after_json` remain out of scope.

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

Result: `PASS`

Evidence:

- `admin01`, `sales01`, and `viewer01` local login smoke passed.
- Session/role connection through `app_login_users` worked.

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

Result: `PARTIAL`

Evidence:

- Local Vercel dev runtime had the env needed for app-mode login smoke.
- Production Vercel env remains part of the scheduled release gate and is not
  documented with real values here.

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

Confirmed in local Vercel dev smoke.

Expected:

- Logout or clear app auth cookie.
- App opens the full-screen login page.
- Sidebar, menu, and header are not visible.
- User ID input is visible.
- Password input is visible.
- Email wording is not visible.

Result: `PASS`

Evidence:

- Full-screen login displayed.
- Sidebar, menu, and header were not visible.
- User ID and password inputs were visible.
- Email wording was not used.

## Role Smoke

### admin01

Expected:

- Login succeeds.
- Header shows display name or `admin01`.
- Standard Effort meta route is accessible.
- `actual_effort_mm` input is editable.
- Logout succeeds.

Result: `PASS`

Evidence:

- Login succeeded.
- Standard Effort meta route was accessible.

### sales01

Expected:

- Login succeeds.
- Standard Effort meta route is not accessible.
- Solution toggle is available.
- Item checkbox save is available.
- `actual_effort_mm` is disabled/read-only.
- Logout succeeds.

Result: `PASS`

Evidence:

- Login succeeded.
- Standard Effort meta access was blocked.
- Standard Effort estimation screen was usable.
- Item checkbox save worked.
- `actual_effort_mm` was read-only.

### viewer01

Expected:

- Login succeeds.
- Standard Effort meta route is not accessible.
- Solution, item, and actual effort save actions are unavailable.
- Read-only project/standard effort viewing works.
- Excel export follows the current viewer read policy.
- Logout succeeds.

Result: `PASS`

Evidence:

- Login succeeded.
- Standard Effort meta access was blocked.
- Save actions were unavailable.

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

Result: `PARTIAL`

## Overall Result

Current result: `PASS`

Feature-branch local Vercel dev login, role, and row history smoke are
sufficient for the June sign-off and release candidate gate. Production Daily
Release / Vercel deployment smoke remains a separate scheduled release gate.
