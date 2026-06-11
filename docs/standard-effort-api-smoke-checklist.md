# Standard Effort API Smoke Checklist

## 1. Purpose

This checklist verifies that the Standard Effort backend read/write API works
against a real runtime and PostgreSQL database before production rollout. It is
not a replacement for unit tests. It covers runtime environment, DB
prerequisites, curl checks, SQL verification, frontend API mode checks, audit
verification, troubleshooting, cleanup, and sign-off.

Run this in dev or staging first. Do not run destructive cleanup commands in
production.

## 2. Prerequisites

Backend:

- Java 17 or later.
- Maven 3.9 or later.
- `cd backend && mvn test` passes.
- `cd backend && mvn package` passes.
- `backend/target/effort-api.war` exists.
- The backend is running through Tomcat or a local executable WAR runtime.

Database:

- PostgreSQL is reachable from the backend runtime.
- Standard effort schema migrations are applied.
- Standard effort M/M corrective migration is applied.
- Standard effort seed data is applied.
- Auth, permission, and audit schema migrations are applied.
- Project archive migration is applied.
- `public.app_audit_logs` exists.
- `public.app_project_members` exists.
- `public.estimation_projects` exists.

Frontend:

- `VITE_DATA_BACKEND=api`.
- `VITE_API_BASE_URL` points to the Tomcat API base URL.
- `VITE_FEATURE_STANDARD_EFFORT=true`.
- `VITE_STANDARD_EFFORT_MODE=standard`.
- `VITE_FRONTEND_AUDIT_MODE=disabled` or `auto`.
- `VITE_AUTH_PERMISSION_MODE=dev`.
- Dev permission codes include the read/write/export permissions needed for the
  smoke.

## 3. Backend Env Example

PowerShell example:

```powershell
$env:APP_DB_ENABLED = "true"
$env:DB_URL = "jdbc:postgresql://localhost:5432/effort"
$env:DB_USERNAME = "<db-user>"
$env:DB_PASSWORD = "<db-password>"
$env:APP_SECURITY_MODE = "dev"
$env:DEV_USER_ID = "00000000-0000-0000-0000-000000000001"
$env:DEV_USER_EMAIL = "dev@example.com"
$env:DEV_ROLE_CODES = "estimator"
$env:DEV_PERMISSION_CODES = "route.estimator.read,project.read.all,project.write.all,standard_effort.selection.write,standard_effort.actual_effort.write,standard_effort.refresh,export.read,export.standard_effort"
```

Do not commit real database passwords. Use placeholders in documentation and
runtime-only secret injection in deployed environments.

Local executable WAR example:

```powershell
cd backend
java -jar target/effort-api.war
```

External Tomcat deployment URLs may include the WAR context path. Examples:

```text
http://localhost:8080/effort-api/api
http://localhost:8080/api
```

## 4. Frontend Env Example

`.env.local` preview:

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=http://localhost:8080/effort-api/api
VITE_FEATURE_STANDARD_EFFORT=true
VITE_STANDARD_EFFORT_MODE=standard
VITE_FRONTEND_AUDIT_MODE=disabled
VITE_AUTH_PERMISSION_MODE=dev
VITE_DEV_AUTH_EMAIL=dev@example.com
```

Vite env values are build-time inputs. Restart the dev server or rebuild after
changing them.

## 5. DB Prerequisite SQL

Table existence:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'estimation_solution',
    'estimation_solution_variant',
    'estimation_standard_base_effort_meta',
    'estimation_standard_item_meta',
    'estimation_item_solution_coefficient_meta',
    'estimation_project_solution_selection',
    'estimation_project_item_solution_selection',
    'app_audit_logs',
    'app_project_members',
    'estimation_projects'
  )
ORDER BY table_name;
```

M/M column existence:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'estimation_standard_base_effort_meta'
      AND column_name = 'effort_mm')
    OR (table_name = 'estimation_project_solution_selection'
      AND column_name = 'actual_effort_mm')
  )
ORDER BY table_name, column_name;
```

Seed row counts:

```sql
SELECT 'solutions' AS name, COUNT(*) AS row_count
FROM public.estimation_solution
UNION ALL
SELECT 'solution_variants', COUNT(*)
FROM public.estimation_solution_variant
UNION ALL
SELECT 'base_effort_rows', COUNT(*)
FROM public.estimation_standard_base_effort_meta
UNION ALL
SELECT 'item_rows', COUNT(*)
FROM public.estimation_standard_item_meta
UNION ALL
SELECT 'coefficient_rows', COUNT(*)
FROM public.estimation_item_solution_coefficient_meta;
```

Active metadata counts:

```sql
SELECT 'active_solutions' AS name, COUNT(*) AS row_count
FROM public.estimation_solution
WHERE active = true
UNION ALL
SELECT 'active_solution_variants', COUNT(*)
FROM public.estimation_solution_variant
WHERE active = true
UNION ALL
SELECT 'active_base_effort_rows', COUNT(*)
FROM public.estimation_standard_base_effort_meta
WHERE active = true
UNION ALL
SELECT 'active_item_rows', COUNT(*)
FROM public.estimation_standard_item_meta
WHERE active = true
UNION ALL
SELECT 'active_coefficient_rows', COUNT(*)
FROM public.estimation_item_solution_coefficient_meta
WHERE active = true;
```

Pick smoke IDs:

```sql
SELECT id::text AS project_id, project_name, archived
FROM public.estimation_projects
ORDER BY id
LIMIT 10;

SELECT solution_variant_id::text AS solution_variant_id, display_name
FROM public.estimation_solution_variant
WHERE active = true
ORDER BY display_order, solution_code, variant_code
LIMIT 10;

SELECT item_id::text AS item_id, item_name, item_option
FROM public.estimation_standard_item_meta
WHERE active = true
ORDER BY display_order, item_name
LIMIT 10;

SELECT c.item_id::text AS item_id,
       c.solution_variant_id::text AS solution_variant_id,
       c.coefficient
FROM public.estimation_item_solution_coefficient_meta c
WHERE c.active = true
ORDER BY c.solution_variant_id, c.item_id
LIMIT 10;
```

Use a bigint-compatible numeric string for `project_id`. Do not use a UUID as
`project_id`.

## 6. Permission Smoke

PowerShell setup:

```powershell
$API_BASE = "http://localhost:8080/effort-api/api"
$REQUEST_ID = "smoke-permission-001"
```

Current user:

```powershell
curl.exe -i -H "X-Request-Id: $REQUEST_ID" "$API_BASE/me"
```

Permissions:

```powershell
curl.exe -i -H "X-Request-Id: $REQUEST_ID" "$API_BASE/me/permissions"
```

Expected:

- `ok=true`.
- `role_codes` includes the configured role.
- `permission_codes` includes:
  - `route.estimator.read`
  - `standard_effort.selection.write`
  - `standard_effort.actual_effort.write`
  - `project.write.all`

Role names alone, including `system_admin`, must not grant access without
explicit permission codes.

## 7. Health Smoke

Common health:

```powershell
curl.exe -i -H "X-Request-Id: smoke-health-001" "$API_BASE/health"
```

DB health:

```powershell
curl.exe -i -H "X-Request-Id: smoke-db-health-001" "$API_BASE/internal/db-health"
```

Expected:

- `/api/health` returns `ok=true` and `data.status=UP`.
- `/api/internal/db-health` returns `ok=true` and `data.status=UP` when
  `APP_DB_ENABLED=true` and the database is reachable.
- `X-Request-Id` request header is echoed in the response header and metadata.

## 8. Standard Effort Meta Read Smoke

```powershell
curl.exe -i -H "X-Request-Id: smoke-meta-001" "$API_BASE/standard-effort/meta"
```

Expected:

- `ok=true`.
- `data.solutions` length is greater than `0`.
- `data.solution_variants` length is greater than `0`.
- `data.base_effort_rows` length is greater than `0`.
- `data.item_rows` length is greater than `0`.
- `data.coefficient_rows` length is greater than `0`.
- Base effort rows include `effort_mm`.
- Major response fields do not use `effort_md`.
- `coefficient` is treated as a unitless value.

## 9. Project Input Read Smoke

Prepare a test project id from `estimation_projects.id`:

```powershell
$PROJECT_ID = "<numeric-project-id>"
```

Request:

```powershell
curl.exe -i `
  -H "X-Request-Id: smoke-project-input-001" `
  "$API_BASE/projects/$PROJECT_ID/standard-effort"
```

Expected:

- `ok=true`.
- Active metadata arrays are included.
- `project_solution_selections` is included and may be empty for a new project.
- `project_item_selections` is included and may be empty for a new project.
- `project_id` remains a bigint-compatible numeric string.
- Archived project read behavior matches the current project scope policy.

## 10. Solution Write Smoke

Prepare an active solution variant id:

```powershell
$SOLUTION_VARIANT_ID = "<active-solution-variant-uuid>"
```

Request:

```powershell
$solutionBody = @{
  project_id = $PROJECT_ID
  selections = @(
    @{
      solution_variant_id = $SOLUTION_VARIANT_ID
      enabled = $true
      actual_effort_mm = 0
    }
  )
} | ConvertTo-Json -Depth 5

curl.exe -i `
  -X PUT `
  -H "Content-Type: application/json" `
  -H "X-Request-Id: smoke-solution-write-001" `
  -d $solutionBody `
  "$API_BASE/projects/$PROJECT_ID/standard-effort/solutions"
```

Expected:

- `ok=true`.
- `data.project_solution_selections[0].project_id == $PROJECT_ID`.
- `actual_effort_mm` exists.
- A row is inserted or updated in
  `public.estimation_project_solution_selection`.
- `app_audit_logs` contains `standard_effort.solution.toggle`.

Verification SQL:

```sql
SELECT project_id::text,
       solution_variant_id::text,
       enabled,
       actual_effort_mm,
       updated_at
FROM public.estimation_project_solution_selection
WHERE project_id = CAST(:project_id AS bigint)
ORDER BY updated_at DESC;

SELECT event_type, event_result, project_id, target_id, metadata_json, created_at
FROM public.app_audit_logs
WHERE project_id = CAST(:project_id AS bigint)
ORDER BY created_at DESC
LIMIT 10;
```

## 11. Item Write Smoke

Prepare an active item id that has an active coefficient for the selected
solution variant:

```powershell
$ITEM_ID = "<active-item-uuid>"
```

Request:

```powershell
$itemBody = @{
  project_id = $PROJECT_ID
  selections = @(
    @{
      solution_variant_id = $SOLUTION_VARIANT_ID
      item_id = $ITEM_ID
      checked = "Y"
    }
  )
} | ConvertTo-Json -Depth 5

curl.exe -i `
  -X PUT `
  -H "Content-Type: application/json" `
  -H "X-Request-Id: smoke-item-write-001" `
  -d $itemBody `
  "$API_BASE/projects/$PROJECT_ID/standard-effort/items"
```

Expected:

- `checked` normalizes to `true`.
- A row is inserted or updated in
  `public.estimation_project_item_solution_selection`.
- `app_audit_logs` contains `standard_effort.item.check`.

Verification SQL:

```sql
SELECT project_id::text,
       solution_variant_id::text,
       item_id::text,
       checked,
       updated_at
FROM public.estimation_project_item_solution_selection
WHERE project_id = CAST(:project_id AS bigint)
ORDER BY updated_at DESC;

SELECT event_type, event_result, project_id, target_id, metadata_json, created_at
FROM public.app_audit_logs
WHERE project_id = CAST(:project_id AS bigint)
  AND event_type = 'standard_effort.item.check'
ORDER BY created_at DESC
LIMIT 5;
```

## 12. Actual Effort Write Smoke

Request:

```powershell
$actualBody = @{
  project_id = $PROJECT_ID
  solution_variant_id = $SOLUTION_VARIANT_ID
  actual_effort_mm = 12.5
} | ConvertTo-Json -Depth 5

curl.exe -i `
  -X PUT `
  -H "Content-Type: application/json" `
  -H "X-Request-Id: smoke-actual-write-001" `
  -d $actualBody `
  "$API_BASE/projects/$PROJECT_ID/standard-effort/actual-effort"
```

Expected:

- `ok=true`.
- `data.project_solution_selection.actual_effort_mm=12.5`.
- Existing `enabled` value is preserved on update.
- Missing rows are inserted with `enabled=true`.
- A row is inserted or updated in
  `public.estimation_project_solution_selection`.
- `app_audit_logs` contains `standard_effort.actual_effort.update`.

Verification SQL:

```sql
SELECT project_id::text,
       solution_variant_id::text,
       enabled,
       actual_effort_mm,
       updated_at
FROM public.estimation_project_solution_selection
WHERE project_id = CAST(:project_id AS bigint)
  AND solution_variant_id = CAST(:solution_variant_id AS uuid);

SELECT event_type,
       event_result,
       project_id,
       target_id,
       before_json,
       after_json,
       metadata_json,
       created_at
FROM public.app_audit_logs
WHERE project_id = CAST(:project_id AS bigint)
  AND event_type = 'standard_effort.actual_effort.update'
ORDER BY created_at DESC
LIMIT 5;
```

## 13. Negative/Error Smoke

Run these against dev or staging only:

| Case | Expected |
|---|---|
| Missing required permission | `403 FORBIDDEN` |
| `system_admin` role only without permission codes | `403 FORBIDDEN` |
| `projectId=abc` | `400 VALIDATION_ERROR` |
| Body `project_id` differs from path `{projectId}` | `400 VALIDATION_ERROR` |
| `actual_effort_md` present in actual effort request | `400 VALIDATION_ERROR` |
| `actual_effort_mm=-1` | `400 VALIDATION_ERROR` |
| Inactive solution variant | `400 VALIDATION_ERROR` |
| Inactive item or coefficient for item write | `400 VALIDATION_ERROR` |
| Archived project write | `403 FORBIDDEN` |
| `APP_DB_ENABLED=false` for DB-backed endpoints | `503 SERVICE_UNAVAILABLE` |

Example actual effort MD rejection:

```powershell
$badActualBody = @{
  project_id = $PROJECT_ID
  solution_variant_id = $SOLUTION_VARIANT_ID
  actual_effort_md = 1
} | ConvertTo-Json -Depth 5

curl.exe -i `
  -X PUT `
  -H "Content-Type: application/json" `
  -H "X-Request-Id: smoke-actual-md-reject-001" `
  -d $badActualBody `
  "$API_BASE/projects/$PROJECT_ID/standard-effort/actual-effort"
```

## 14. Frontend API Mode Smoke

Steps:

1. Configure `.env.local` with the API mode values in this document.
2. Restart the Vite dev server or rebuild.
3. Open standard mode.
4. Select a project.
5. Confirm the Standard Effort section loads.
6. Toggle a solution and confirm save success.
7. Toggle an item checkbox and confirm save success.
8. Change `actual_effort_mm` and blur the input to save.
9. Confirm Enter commits and Escape reverts for the draft actual effort input.
10. Click the Standard Effort refresh button and confirm metadata reload.
11. Run Excel export in standard API mode.
12. Verify backend authoritative audit rows in `app_audit_logs`.

Recommended frontend audit setting for API smoke:

```env
VITE_FRONTEND_AUDIT_MODE=disabled
```

Use `shadow` only when comparing frontend and backend audit rows during a
transition. Do not leave `shadow` enabled for normal operation.

## 15. Expected UI Behavior

- In `standard` mode, legacy controls are hidden or collapsed.
- Legacy RightSidebar controls are hidden in standard mode.
- Archived projects load as read-only when directly opened.
- Archived projects are excluded from normal project selectors.
- Standard export works only in API mode.
- Supabase backend mode shows standard export as unsupported and must not fall
  back to legacy export.

## 16. Troubleshooting Matrix

| Symptom | Check |
|---|---|
| DB health is `DISABLED` | Verify `APP_DB_ENABLED=true` in the backend runtime. |
| `SERVICE_UNAVAILABLE` | Verify `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, JDBC driver, and network access. |
| `403 FORBIDDEN` | Verify `DEV_PERMISSION_CODES` and project scope permission. |
| `401 UNAUTHORIZED` | Verify auth mode and current user provider configuration. |
| `400 VALIDATION_ERROR` | Check path/body `project_id`, UUID values, required fields, and forbidden fields. |
| `actual_effort_md` rejected | Remove legacy MD fields and send only `actual_effort_mm`. |
| No audit row | Verify `AuditService`, `JdbcAuditRepository`, `app_audit_logs`, and DB transaction success. |
| Frontend still uses Supabase | Verify `VITE_DATA_BACKEND=api`, restart dev server, or rebuild. |
| Standard export unsupported | Verify `VITE_DATA_BACKEND=api` and `VITE_API_BASE_URL`. |
| `project_id` treated like UUID | Use `estimation_projects.id` as bigint-compatible numeric string. |
| Request id missing | Send `X-Request-Id` and inspect response header plus `meta.request_id`. |

## 17. Rollback / Cleanup

Prefer reversible test data cleanup:

- Use dedicated dev/stage projects for smoke runs.
- Prefer archive/restore workflows over hard delete once Project API exists.
- Avoid hard deletes in shared environments.
- Preserve audit logs unless a dev/stage cleanup policy explicitly allows
  removal.

Optional dev-only cleanup template:

```sql
-- Use only for dedicated smoke test projects in dev/stage.
DELETE FROM public.estimation_project_item_solution_selection
WHERE project_id = CAST(:project_id AS bigint);

DELETE FROM public.estimation_project_solution_selection
WHERE project_id = CAST(:project_id AS bigint);
```

Do not delete `app_audit_logs` in environments where audit history is part of
the verification record.

## 18. Sign-Off Checklist

- Backend health OK.
- DB health OK.
- Permission smoke OK.
- Standard Effort meta read OK.
- Project input read OK.
- Solution write OK.
- Item write OK.
- Actual effort write OK.
- Backend authoritative audit OK.
- Frontend load/save/export OK.
- No M/D to M/M conversion.
- `actual_effort_mm` confirmed in API response and DB.
- `project_id` bigint-compatible numeric string confirmed.
- `enabled` preservation on actual effort update confirmed.
- Request id pass-through confirmed.
- Negative/error cases sampled and produce expected wrappers.
