# Standard Effort API Smoke Result

## 1. Execution Info

| Item | Result |
|---|---|
| Executed at | 2026-06-07 18:08:26 +09:00 |
| Executor | Codex local workspace run |
| Environment | local readiness only; dev/stage API smoke blocked |
| Backend artifact | `backend/target/effort-api.war` |
| Backend base URL | Not verified. `http://localhost:8080/effort-api/api` and `http://localhost:8080/api` did not respond. |
| Frontend mode | `.env.local` key presence checked only; `VITE_API_BASE_URL` key is missing. |
| DB schema/migration state | Not verified against a live DB in this run. |
| Secret handling | Secret values were not printed or recorded. Only required env key presence was checked. |

This result documents the Phase 9-I-10 smoke attempt. Backend and frontend
build/test readiness passed, but live API/DB smoke was not executed because no
backend runtime was reachable on localhost and no API base URL was configured
in `.env.local`.

## Phase 9-I-10-S Decision Update

Current interim decision:

- Keep `VITE_DATA_BACKEND=supabase` for day-to-day development and validation.
- Defer Tomcat API DB smoke until an internal dev/stage PostgreSQL database is
  ready.
- Use the Tomcat backend only up to DB-disabled basic runtime smoke for now.
- Reopen API DB smoke as Phase 9-I-10-R after DB URL, DB user, DB password,
  migrations, seed data, audit tables, project membership rows, and smoke IDs
  are available.
- Continue frontend Standard Effort calculation and meta admin development
  through Supabase direct repository mode.

Reason:

- No internal DB is ready for this smoke.
- No copied test data exists yet.
- API mode requires `APP_DB_ENABLED=true` plus database prerequisites before
  Standard Effort DB-backed endpoints can return real data.
- Supabase mode is the active development path until the API runtime has a
  prepared dev/stage database.

Secrets policy:

- Do not document real `DB_PASSWORD`, tokens, authorization headers, Supabase
  service role keys, or real Supabase anon key values.
- `VITE_SUPABASE_ANON_KEY` is a public client key, but this document still uses
  placeholders only.

## Phase 9-I-10-S DB-Disabled Basic Runtime Smoke Record

Reported backend base URL:

```text
http://localhost:18080/effort-api/api
```

Recorded result:

| Endpoint | APP_DB_ENABLED | Expected | Result |
|---|---|---|---|
| `GET /health` | `false` | `200`, `UP` | PASS |
| `GET /internal/db-health` | `false` | `200`, `DISABLED` | PASS |
| `GET /me` | `false` | `200` | PASS |
| `GET /me/permissions` | `false` | `200` | PASS |
| `GET /standard-effort/meta` | `false` | `503`, `SERVICE_UNAVAILABLE` | PASS |

Interpretation:

- The common web/runtime skeleton is healthy.
- DB-required Standard Effort endpoints do not return fake data when database
  access is disabled.
- Full Standard Effort API DB smoke remains deferred.

## Supabase Interim Frontend Env Matrix

Recommended `.env.local` shape while API DB smoke is deferred:

```env
VITE_DATA_BACKEND=supabase
VITE_FEATURE_STANDARD_EFFORT=true
VITE_STANDARD_EFFORT_MODE=standard
VITE_AUTH_PERMISSION_MODE=disabled
VITE_FRONTEND_AUDIT_MODE=auto
VITE_FEATURE_STANDARD_EFFORT_META=true
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Notes:

- Do not place actual Supabase URL/key values in docs.
- Never use or expose a Supabase service role key in frontend env.
- Restart the Vite dev server or rebuild after env changes.
- `VITE_API_BASE_URL` is required only when reopening API mode.

## Supabase Mode Interim Smoke Checklist

Use this checklist while `VITE_DATA_BACKEND=supabase` remains the active path:

- Project list loads.
- Project selection works.
- Standard mode opens.
- Standard Effort section loads.
- Solution toggle saves.
- Item checkbox saves.
- `actual_effort_mm` saves on blur.
- Enter commits the `actual_effort_mm` draft.
- Escape reverts the `actual_effort_mm` draft.
- Standard Effort refresh reloads metadata.
- Standard Effort meta admin page loads.
- Base effort row save works.
- Coefficient row save works.
- Solution variant active toggle saves.
- Standard item active toggle saves.
- Archive/restore UX differences versus API mode are noted when tested.

Recommended commands:

```powershell
npm.cmd run test:run
npm.cmd run build

cd backend
mvn test
mvn package
```

## Supabase Mode DB Prerequisite Summary

Expected Supabase-side prerequisites:

- Standard Effort schema migration applied.
- Standard Effort seed applied.
- M/M corrective migration applied.
- Auth/permission/audit schema applied if frontend audit remains enabled.
- Archive columns applied if archive UX is tested.

Useful SQL checks:

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

SELECT table_name, column_name
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

## API DB Smoke Reopen Conditions

Reopen as Phase 9-I-10-R when all of these are ready:

- Dev/stage PostgreSQL `DB_URL`.
- DB user and password available through secure runtime secret injection.
- Migrations and seed data applied.
- `public.app_audit_logs` exists.
- `public.app_project_members` exists.
- Dedicated smoke `project_id` selected as bigint-compatible numeric string.
- Active `solution_variant_id` selected.
- Active `item_id` selected with an active coefficient for the variant.
- Backend starts with `APP_DB_ENABLED=true`.
- Frontend uses `VITE_DATA_BACKEND=api`.
- Frontend has `VITE_API_BASE_URL` set.

## Deferred Status Table

| Item | Current status | Reason | Reopen condition |
|---|---|---|---|
| DB prerequisite SQL | DEFERRED | Internal DB not ready | DB connection info and applied migrations/seed |
| Standard Effort API write smoke | DEFERRED | DB not connected | `APP_DB_ENABLED=true` plus smoke IDs |
| Frontend API mode smoke | DEFERRED | API DB smoke not ready | `VITE_DATA_BACKEND=api` and `VITE_API_BASE_URL` |
| Supabase mode frontend smoke | ACTIVE | Current development path | Continue with Supabase env |
| Server-side recalculation | DEFERRED | Not implemented by design | Separate recalculate phase |
| Standard export in Supabase mode | LIMITED | Export path is API-backed in standard mode | Separate local standard export phase if needed |

## Standard Export Note

- Standard Effort export is currently connected to standard mode plus API
  backend.
- In `VITE_DATA_BACKEND=supabase`, standard mode may show Standard Effort export
  as unsupported.
- Supabase mode must not silently fall back to legacy export for standard mode.
- Legacy and parallel modes continue to use existing frontend-local legacy
  export.
- If Standard Effort export is needed in Supabase mode, implement a separate
  local Standard Effort export path in a future phase.

## 2. Backend Runtime Readiness

| Check | Result |
|---|---|
| `java -version` | PASS: OpenJDK 17.0.19 |
| `mvn -version` | PASS: Apache Maven 3.9.16, Java 17.0.19 |
| `mvn test` | PASS: 194 tests, 0 failures, 0 errors |
| `mvn package` | PASS: WAR packaged successfully |
| WAR path | `C:\dev\effort_estimator\backend\target\effort-api.war` |
| Backend health URL | BLOCKED: localhost runtime did not respond |

Runtime health attempts:

```text
curl.exe -i --max-time 5 http://localhost:8080/effort-api/api/health
Result: curl (7), could not connect to localhost:8080

curl.exe -i --max-time 5 http://localhost:8080/api/health
Result: curl (7), could not connect to localhost:8080
```

## 3. DB Prerequisite Verification Result

Status: SKIPPED.

Reason:

- No live backend runtime was reachable.
- No DB connection details were supplied to this session.
- Secret values such as `DB_PASSWORD` must not be read from or written to docs.
- No direct DB connection was attempted.

Required table existence checks remain pending:

- `estimation_solution`
- `estimation_solution_variant`
- `estimation_standard_base_effort_meta`
- `estimation_standard_item_meta`
- `estimation_item_solution_coefficient_meta`
- `estimation_project_solution_selection`
- `estimation_project_item_solution_selection`
- `estimation_projects`
- `app_audit_logs`
- `app_project_members`

Required M/M column checks remain pending:

- `estimation_standard_base_effort_meta.effort_mm`
- `estimation_project_solution_selection.actual_effort_mm`

Required row count checks remain pending:

- solutions count
- variants count
- base effort rows count
- item rows count
- coefficient rows count
- active meta counts

## 4. Smoke Test Input IDs

Status: SKIPPED.

No live DB query was run, so no smoke IDs were selected.

| Field | Result |
|---|---|
| `project_id` | Pending; must be `estimation_projects.id` as bigint-compatible numeric string |
| `solution_variant_id` | Pending; must be an active UUID string |
| `item_id` | Pending; must be an active UUID string with active coefficient for the selected variant |
| `project_name` | Pending |
| selected solution display name | Pending |
| item name | Pending |

Do not convert `project_id` to UUID. `solution_variant_id` and `item_id` are
UUID strings.

## 5. Health Smoke Result

Status: BLOCKED.

| Endpoint | HTTP status | `ok` | `data.status` | `X-Request-Id` | Result |
|---|---:|---|---|---|---|
| `GET /api/health` | N/A | N/A | N/A | N/A | Runtime not reachable |
| `GET /api/internal/db-health` | N/A | N/A | N/A | N/A | Runtime not reachable |

Finding:

- No server accepted connections on localhost port `8080`.

## 6. Auth/Permission Smoke Result

Status: SKIPPED.

Reason:

- Backend runtime was not reachable.

Pending checks:

- `GET /api/me`
- `GET /api/me/permissions`
- `ok=true`
- `dev_only=true`
- `permission_codes` includes:
  - `route.estimator.read`
  - `standard_effort.selection.write`
  - `standard_effort.actual_effort.write`
  - `project.write.all`

Env key presence check for frontend API mode:

| Key | Present in `.env.local` |
|---|---|
| `VITE_DATA_BACKEND` | yes |
| `VITE_API_BASE_URL` | no |
| `VITE_FEATURE_STANDARD_EFFORT` | yes |
| `VITE_STANDARD_EFFORT_MODE` | yes |
| `VITE_FRONTEND_AUDIT_MODE` | yes |
| `VITE_AUTH_PERMISSION_MODE` | yes |

Values were intentionally not printed.

## 7. Standard Effort Meta Read Result

Status: SKIPPED.

Reason:

- Backend runtime was not reachable.

Pending checks:

- HTTP status.
- `ok=true`.
- `solutions` length.
- `solution_variants` length.
- `base_effort_rows` length.
- `item_rows` length.
- `coefficient_rows` length.
- `effort_mm` present.
- `effort_md` not exposed as a major response field.
- `coefficient` treated as unitless.

## 8. Project Input Read Result

Status: SKIPPED.

Reason:

- Backend runtime was not reachable.
- No smoke `project_id` was selected from DB.

Pending checks:

- HTTP status.
- `ok=true`.
- Active meta arrays length.
- `project_solution_selections` length.
- `project_item_selections` length.
- Archived project read behavior.
- `ProjectScopeService.requireRead(context)` pass.

## 9. Solution Write Result

Status: SKIPPED.

Reason:

- Backend runtime was not reachable.
- No smoke project/variant IDs were selected from DB.
- Writes must be run only against a dedicated dev/stage smoke project.

Pending request:

```json
{
  "project_id": "{projectId}",
  "selections": [
    {
      "solution_variant_id": "{solutionVariantId}",
      "enabled": true,
      "actual_effort_mm": 0
    }
  ]
}
```

Pending checks:

- HTTP status.
- `ok=true`.
- Returned `project_id`.
- Returned `solution_variant_id`.
- Returned `enabled`.
- Returned `actual_effort_mm`.
- DB row upserted in `estimation_project_solution_selection`.
- Audit row written with `standard_effort.solution.toggle`.

## 10. Item Write Result

Status: SKIPPED.

Reason:

- Backend runtime was not reachable.
- No smoke project/variant/item IDs were selected from DB.

Pending request:

```json
{
  "project_id": "{projectId}",
  "selections": [
    {
      "solution_variant_id": "{solutionVariantId}",
      "item_id": "{itemId}",
      "checked": "Y"
    }
  ]
}
```

Pending checks:

- HTTP status.
- `ok=true`.
- `checked` normalized to `true`.
- DB row upserted in `estimation_project_item_solution_selection`.
- Audit row written with `standard_effort.item.check`.

## 11. Actual Effort Write Result

Status: SKIPPED.

Reason:

- Backend runtime was not reachable.
- No smoke project/variant IDs were selected from DB.

Pending request:

```json
{
  "project_id": "{projectId}",
  "solution_variant_id": "{solutionVariantId}",
  "actual_effort_mm": 12.5
}
```

Pending checks:

- HTTP status.
- `ok=true`.
- Returned `actual_effort_mm=12.5`.
- Existing `enabled` value preserved on update.
- Missing row inserted with `enabled=true`.
- DB row upserted in `estimation_project_solution_selection`.
- Audit row written with `standard_effort.actual_effort.update`.

## 12. Audit Verification

Status: SKIPPED.

Reason:

- Standard Effort write smoke requests were not executed.
- No DB query was run.

Pending SQL:

```sql
SELECT event_type,
       event_result,
       target_type,
       target_id,
       project_id,
       metadata_json,
       request_id,
       created_at
FROM public.app_audit_logs
WHERE project_id = CAST(:project_id AS bigint)
ORDER BY created_at DESC
LIMIT 20;
```

Pending checks:

- `standard_effort.solution.toggle`
- `standard_effort.item.check`
- `standard_effort.actual_effort.update`
- `event_result=success`
- `metadata_json.section`
- `metadata_json.unit=M/M` for solution/actual
- `request_id` exists

## 13. Negative Smoke Result

Status: SKIPPED.

Reason:

- Backend runtime was not reachable.
- Some cases require a controlled runtime restart or DB state setup.

Pending negative checks:

| Case | Expected |
|---|---|
| Missing permission | `403 FORBIDDEN` |
| Invalid `projectId=abc` | `400 VALIDATION_ERROR` |
| Body/path `project_id` mismatch | `400 VALIDATION_ERROR` |
| `actual_effort_md` present | `400 VALIDATION_ERROR` |
| Negative `actual_effort_mm` | `400 VALIDATION_ERROR` |
| Effort field in item write | `400 VALIDATION_ERROR` |
| Archived project write | `403 FORBIDDEN` |
| DB disabled | `503 SERVICE_UNAVAILABLE` |

DB disabled negative smoke may require backend restart with
`APP_DB_ENABLED=false`; it was not attempted in this run.

## 14. Frontend API Mode Smoke Result

Status: BLOCKED.

Reason:

- `VITE_API_BASE_URL` is missing from `.env.local`.
- Backend runtime was not reachable.
- No live API smoke could be run from the frontend.

Pending steps:

1. Configure frontend env.
2. Restart dev server or rebuild.
3. Enter standard mode.
4. Select project.
5. Confirm standard effort load.
6. Save solution toggle.
7. Save item checkbox.
8. Save `actual_effort_mm` on blur.
9. Refresh.
10. Excel export.
11. Confirm backend authoritative audit.

Pending result fields:

- Each step pass/fail.
- Screen messages.
- Console/network errors.
- Confirmation that API URL is Tomcat API, not Supabase.

## 15. Troubleshooting / Findings

| Item | Symptom | Likely Cause | Action | Follow-up Phase Needed |
|---|---|---|---|---|
| Backend runtime | `curl` to localhost `8080` failed | Backend/Tomcat not running locally | Start Tomcat or run `java -jar backend/target/effort-api.war` with DB env | Yes, rerun smoke |
| Frontend env | `VITE_API_BASE_URL` missing | API mode env not fully configured | Add `VITE_API_BASE_URL` in `.env.local` or deployment env and restart Vite/build | Yes, rerun frontend smoke |
| DB prerequisites | Not verified | No DB connection details/runtime | Run SQL from checklist in dev/stage with masked secrets | Yes |
| Write/audit smoke | Not executed | Runtime and DB blocked | Use dedicated dev/stage smoke project and rerun | Yes |

## 16. Sign-Off

| Check | Status |
|---|---|
| backend health OK | BLOCKED |
| DB health OK | BLOCKED |
| auth/permission OK | SKIPPED |
| meta read OK | SKIPPED |
| project input read OK | SKIPPED |
| solution write OK | SKIPPED |
| item write OK | SKIPPED |
| actual write OK | SKIPPED |
| audit OK | SKIPPED |
| frontend load/save/export OK | BLOCKED |
| no M/D conversion | NOT REGRESSED BY CODE; runtime not verified |
| `actual_effort_mm` confirmed | NOT REGRESSED BY TESTS; runtime not verified |
| `project_id` bigint confirmed | NOT REGRESSED BY TESTS; runtime not verified |
| `request_id` confirmed | NOT REGRESSED BY TESTS; runtime not verified |

Overall smoke sign-off: BLOCKED, not passed.

## 17. Follow-Up Work

Recommended next phase:

- Start backend runtime with masked dev/stage DB env.
- Add `VITE_API_BASE_URL` to frontend env for API mode.
- Select a dedicated dev/stage smoke project.
- Run the checklist in
  [standard-effort-api-smoke-checklist.md](./standard-effort-api-smoke-checklist.md).
- Update this result document with actual HTTP, SQL, audit, and frontend
  outcomes.

Additional future candidates:

- Fix any failed smoke item in a focused follow-up phase.
- Design `POST /api/projects/{projectId}/standard-effort/recalculate`.
- Implement StandardEffortMeta backend API.
- Run Project CRUD backend API smoke after project endpoints exist.
- Add Jenkins/deployment skeleton after runtime smoke is repeatable.
