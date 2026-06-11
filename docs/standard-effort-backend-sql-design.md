# Standard Effort Backend SQL Design

## 1. Purpose

This document defines the database table mapping, SQL shape, DTO candidates, and
service boundary for the Standard Effort backend read APIs.

The goal is to keep the Tomcat API contract aligned with the existing frontend
`standardEffortApiAdapter` response shape while moving away from frontend direct
database access. The database intentionally does not rely on physical foreign
keys for these tables, so logical reference validation belongs in the
repository/service/API layer.

Phase 9-I-0 was documentation only. Later implementation phases should update
the status section below as backend read APIs are added.

## Implementation Status

Phase 9-I-1-alt implements only:

- `GET /api/standard-effort/meta`
- Standard Effort active meta DTOs
- `StandardEffortRepository`
- `StandardEffortJdbcRepository`
- `StandardEffortService`
- `StandardEffortController`

Phase 9-I-2 adds a ProjectContext lookup skeleton for future project-bound
endpoints. It does not expose the project input endpoint yet.

Phase 9-I-3 implements:

- `GET /api/projects/{projectId}/standard-effort`
- project selection read DTOs
- `StandardEffortProjectInputResponse`
- project selection read queries
- `ProjectContextService.loadProjectAccessContext(projectId)` wiring
- `ProjectScopeService.requireRead(context)` wiring

Still not implemented:

- Standard Effort write APIs
- Server-side standard effort calculation
- Audit DB insert

## 2. Target APIs

Read APIs to design first:

- `GET /api/standard-effort/meta`
- `GET /api/projects/{projectId}/standard-effort`

Write APIs are follow-up work:

- `PUT /api/projects/{projectId}/standard-effort/solutions`
- `PUT /api/projects/{projectId}/standard-effort/items`
- `PUT /api/projects/{projectId}/standard-effort/actual-effort`

Recommended implementation priority:

1. `GET /api/standard-effort/meta`
2. `GET /api/projects/{projectId}/standard-effort`
3. Write APIs in later phases

## 3. Target Tables

Active meta for estimation:

- `public.estimation_solution`
- `public.estimation_solution_variant`
- `public.estimation_standard_base_effort_meta`
- `public.estimation_standard_item_meta`
- `public.estimation_item_solution_coefficient_meta`

Project selections:

- `public.estimation_project_solution_selection`
- `public.estimation_project_item_solution_selection`

Related project table:

- `public.estimation_projects`

Notes:

- `app_project_members` is used by `ProjectContextService` to build assigned
  user context for project scope checks. It is not joined into Standard Effort
  meta queries.
- Physical foreign keys are not required and should not be assumed.
- Reference integrity must be validated logically in repository/service/API code.
- `project_id` follows `estimation_projects.id` and must be treated as
  `bigint`/`int8`. JSON may use a number or a numeric string.
- Do not convert `project_id` to UUID.

## 4. Active Meta Read Policy

Endpoint:

```http
GET /api/standard-effort/meta
```

Required permission:

- `route.estimator.read`

Response data:

```json
{
  "solutions": [],
  "solutionVariants": [],
  "baseEffortRows": [],
  "itemRows": [],
  "coefficientRows": []
}
```

Policy:

- Return only `active = true` rows.
- Apply `active = true` independently to solutions, variants, base effort rows,
  item rows, and coefficient rows.
- Sort by `display_order` where available.
- Do not use Supabase-style nested FK joins.
- Query tables independently and compose the response in the service layer.
- `coefficientRows` should be ordered by `solution_variant_id`, then `item_id`.
- Read audit is not written by default.

The JSON contract should remain compatible with the current frontend API
adapter. The backend may use Java camelCase fields internally, but response JSON
must stay snake_case through Jackson configuration or explicit annotations.

## 5. Project Standard Effort Input Read Policy

Endpoint:

```http
GET /api/projects/{projectId}/standard-effort
```

Required permissions:

- `route.estimator.read`
- Project read scope:
  - `project.read.own`
  - `project.read.department`
  - `project.read.all`

Recommended response data:

```json
{
  "solutions": [],
  "solution_variants": [],
  "base_effort_rows": [],
  "item_rows": [],
  "coefficient_rows": [],
  "project_solution_selections": [],
  "project_item_selections": []
}
```

Selection-only response is tolerated by the frontend adapter, but the backend
should prefer the full input shape so the frontend does not need an additional
meta request.

Policy:

- Receive `projectId` as a bigint-compatible string.
- Do not convert `projectId` to UUID.
- Check that the project exists in `estimation_projects`.
- Load project context with `ProjectContextService`.
- Enforce read scope with `ProjectScopeService.requireRead(context)`.
- Archived projects may still be readable.
- Writes to archived projects should be blocked by write paths later.
- Selection rows are queried by `project_id = ?`.
- New projects with no selections return empty arrays.
- Active meta uses the same active-only policy as `GET /api/standard-effort/meta`.
- Historical selections pointing to inactive meta may remain in selection tables,
  but inactive meta rows should not be included in the active meta arrays.
- The read API does not calculate standard effort. Calculation remains a
  separate responsibility.
- Read audit is not written by default.

## 6. SQL Design

### Active Solutions

```sql
SELECT
  solution_code,
  solution_name,
  display_order,
  active
FROM public.estimation_solution
WHERE active = true
ORDER BY display_order, solution_name;
```

### Active Solution Variants

```sql
SELECT
  solution_variant_id,
  solution_code,
  variant_code,
  variant_name,
  display_name,
  display_order,
  active
FROM public.estimation_solution_variant
WHERE active = true
ORDER BY display_order, solution_code, variant_code;
```

### Active Base Effort Rows

```sql
SELECT
  base_effort_id,
  solution_variant_id,
  phase_code,
  phase_name,
  effort_mm,
  display_order,
  active
FROM public.estimation_standard_base_effort_meta
WHERE active = true
ORDER BY solution_variant_id, display_order, phase_code;
```

### Active Item Rows

```sql
SELECT
  item_id,
  excel_row_no,
  category_l1,
  category_l2,
  item_name,
  item_option,
  display_order,
  active
FROM public.estimation_standard_item_meta
WHERE active = true
ORDER BY display_order, category_l1, item_name, item_option;
```

### Active Coefficient Rows

```sql
SELECT
  item_id,
  solution_variant_id,
  coefficient,
  active
FROM public.estimation_item_solution_coefficient_meta
WHERE active = true
ORDER BY solution_variant_id, item_id;
```

### Project Solution Selections

```sql
SELECT
  project_id::text AS project_id,
  solution_variant_id::text AS solution_variant_id,
  enabled,
  actual_effort_mm,
  created_at,
  updated_at
FROM public.estimation_project_solution_selection
WHERE project_id = CAST(? AS bigint)
ORDER BY solution_variant_id;
```

### Project Item Selections

```sql
SELECT
  project_id::text AS project_id,
  solution_variant_id::text AS solution_variant_id,
  item_id::text AS item_id,
  checked,
  created_at,
  updated_at
FROM public.estimation_project_item_solution_selection
WHERE project_id = CAST(? AS bigint)
ORDER BY solution_variant_id, item_id;
```

### Project Summary Lookup

```sql
SELECT
  id,
  project_name,
  status,
  archived_at,
  owner_user_id,
  department_id
FROM public.estimation_projects
WHERE id = ?;
```

Schema caveat:

- Current archive-related migrations are known to include `status`,
  `archived_at`, `archived_by`, and `archive_reason`.
- `owner_user_id` and `department_id` must be verified before implementing this
  SQL.
- If `owner_user_id` or `department_id` are missing, the ProjectScopeService DB
  lookup cannot fully enforce owner/department scope yet.
- Assigned users likely require a later `app_project_members` lookup.

## 7. DTO Design

Candidate Java DTOs:

- `StandardEffortMetaResponse`
- `StandardEffortProjectInputResponse`
- `SolutionDto`
- `SolutionVariantDto`
- `BaseEffortRowDto`
- `StandardItemRowDto`
- `CoefficientRowDto`
- `ProjectSolutionSelectionDto`
- `ProjectItemSelectionDto`
- `ProjectSummaryDto`

Field naming:

- Java fields may be camelCase.
- Response JSON must remain snake_case.
- Frontend/DB/API contract should continue using snake_case shapes.

### SolutionDto

- `solutionCode`
- `solutionName`
- `displayOrder`
- `active`

### SolutionVariantDto

- `solutionVariantId`
- `solutionCode`
- `variantCode`
- `variantName`
- `displayName`
- `displayOrder`
- `active`

### BaseEffortRowDto

- `baseEffortId`
- `solutionVariantId`
- `phaseCode`
- `phaseName`
- `effortMm`
- `displayOrder`
- `active`

### StandardItemRowDto

- `itemId`
- `excelRowNo`
- `categoryL1`
- `categoryL2`
- `itemName`
- `itemOption`
- `displayOrder`
- `active`

### CoefficientRowDto

- `itemId`
- `solutionVariantId`
- `coefficient`
- `active`

### ProjectSolutionSelectionDto

- `projectId`
- `solutionVariantId`
- `enabled`
- `actualEffortMm`

### ProjectItemSelectionDto

- `projectId`
- `solutionVariantId`
- `itemId`
- `checked`

### ProjectSummaryDto

- `projectId`
- `projectName`
- `status`
- `archivedAt`
- `ownerUserId`
- `departmentId`
- `assignedUserIds`

`assignedUserIds` may be empty until a project membership lookup is implemented.

## 8. Repository Design

Candidate class:

- `StandardEffortRepository`

Candidate methods:

- `List<SolutionDto> findActiveSolutions()`
- `List<SolutionVariantDto> findActiveSolutionVariants()`
- `List<BaseEffortRowDto> findActiveBaseEffortRows()`
- `List<StandardItemRowDto> findActiveItemRows()`
- `List<CoefficientRowDto> findActiveCoefficientRows()`
- `List<ProjectSolutionSelectionDto> findProjectSolutionSelections(String projectId)`
- `List<ProjectItemSelectionDto> findProjectItemSelections(String projectId)`
- `Optional<ProjectSummaryDto> findProjectSummary(String projectId)`

Recommended DB access:

- Start with `JdbcTemplate`.
- Define explicit `RowMapper` implementations or small private mapper methods.
- Keep SQL in repository code for the first implementation.
- Do not introduce MyBatis, JPA, or Flyway in this read API phase.
- Do not use nested FK joins.
- Keep `projectId` as a string or long-compatible value without UUID conversion.

This section is a design only. No repository class is implemented in this phase.

## 9. Service Design

Candidate class:

- `StandardEffortService`

Candidate methods:

- `StandardEffortMetaResponse getActiveMeta()`
- `StandardEffortProjectInputResponse getProjectInput(String projectId)`

Candidate dependencies:

- `StandardEffortRepository`
- `PermissionService`
- `ProjectScopeService`

Responsibilities:

- Validate `projectId` format as bigint-compatible input.
- Verify project existence.
- Delegate route-level permission to controller annotations.
- Build `ProjectAccessContext` and call `ProjectScopeService.requireRead(...)`
  for project-specific reads.
- Compose active meta and project selections.
- Normalize nullable numeric and boolean values defensively.
- Preserve `effort_mm`, `actual_effort_mm`, `standard_effort_mm`, and `gap_mm`
  semantics as M/M values.
- Preserve `coefficient` as a unitless value.
- Avoid any M/D to M/M or M/M to M/D conversion.
- Do not calculate standard effort in read APIs.

## 10. Controller Design

Candidate class:

- `StandardEffortController`

Candidate endpoints:

```java
@GetMapping("/api/standard-effort/meta")
@RequirePermission("route.estimator.read")
```

```java
@GetMapping("/api/projects/{projectId}/standard-effort")
@RequirePermission("route.estimator.read")
```

The project input endpoint calls service code that loads project context and
performs the `ProjectScopeService.requireRead(context)` check.

Response wrapper:

```java
ApiResponse.ok(data, requestId)
```

The current backend scaffold implements both read endpoints above. Write,
calculation, and audit endpoints remain follow-up work.

## 11. Project Scope Integration Caveat

The current `ProjectScopeService` is a pure context-based decision service. To
use it for the project input endpoint, a reliable `ProjectAccessContext` must be
built from database-backed project data.

Required context fields:

- `project_id`
- `owner_user_id`
- `department_id`
- `assigned_user_ids`
- `status`
- `archived_at`

Current known schema state:

- `status` and `archived_at` exist from archive-related work.
- `owner_user_id` and `department_id` require schema verification.
- `assigned_user_ids` likely require `app_project_members` or equivalent lookup.

Implemented preparation:

- `ProjectContextRepository` and `ProjectContextService` now provide the lookup
  and mapping boundary needed before project-bound Standard Effort endpoints
  can call `ProjectScopeService`.
- `project_id` is validated as a numeric string and preserved as a string.
- `estimation_projects.id` is queried with `CAST(? AS bigint)`.
- Optional `owner_user_id` and `department_id` are read through defensive JSON
  extraction and may be `null`.
- Assigned user ids are read from `app_project_members`.

Current endpoint wiring:

- `GET /api/projects/{projectId}/standard-effort` now calls
  `ProjectContextService.loadProjectAccessContext(projectId)`.
- The service then calls `ProjectScopeService.requireRead(context)`.
- Active metadata and project selections are composed only after the project
  read scope check succeeds.

Remaining follow-up:

- Decide department hierarchy rules if simple department equality is not
  sufficient.
- Implement write endpoints, server-side calculation, and authoritative audit.

## 12. Error Handling Policy

Candidate error cases:

- Invalid `projectId`
- Project not found
- Permission denied
- DB disabled
- DB query failure
- Logical reference missing

Candidate error codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `FORBIDDEN`
- `INTERNAL_ERROR`
- `SERVICE_UNAVAILABLE`
- `DB_DISABLED`

DB disabled policy:

- `GET /api/internal/db-health` may return `DISABLED` when
  `app.db.enabled=false`.
- Standard Effort read APIs require DB access and should not return fake data
  when DB is disabled.
- Preferred behavior is a clear service-level error such as
  `SERVICE_UNAVAILABLE` or `DB_DISABLED`, wrapped by the common API error
  response.

## 13. Test Strategy

### Repository Tests

- Verify `JdbcTemplate` query calls.
- Verify SQL parameter binding for `project_id`.
- Verify `RowMapper` mapping for all DTOs.
- Verify `project_id` numeric string pass-through.
- Verify `effort_mm` mapping.
- Verify `actual_effort_mm` mapping.
- Verify null numeric fallback policy where service/repository owns it.

### Service Tests

- Active meta response shape.
- Project selections returned as empty arrays for a new project.
- Project not found.
- Project read scope denied.
- Archived project read allowed.
- DB disabled behavior.
- No standard effort calculation in read API.

### Controller Tests

- `GET /api/standard-effort/meta`
- `GET /api/projects/{projectId}/standard-effort`
- `@RequirePermission("route.estimator.read")` enforcement.
- `request_id` response wrapper.
- `FORBIDDEN` wrapper for project scope denial.
- `NOT_FOUND` wrapper for missing project.

### Integration Smoke Tests

- `APP_DB_ENABLED=true`
- `DB_URL` configured.
- Standard effort seed data applied.
- Response contains expected solution/meta fixture rows.
- Project selection response returns empty arrays for a project without
  selections.

## 14. Implementation Order Proposal

### Phase 9-I-1

Implemented active meta read:

- `GET /api/standard-effort/meta`
- active meta DTOs, repository, service, and controller
- `route.estimator.read`

### Phase 9-I-2

Implemented project context lookup skeleton:

- `ProjectContextRepository`
- `JdbcProjectContextRepository`
- `ProjectContextService`
- numeric string project id validation
- `app_project_members` assigned user lookup

### Phase 9-I-3

Implemented project input endpoint:

- `GET /api/projects/{projectId}/standard-effort`

Apply:

- `route.estimator.read`
- Project context lookup
- Project read scope integration via `ProjectScopeService.requireRead(context)`
- Active meta plus project selections
- Common response wrapper
- Request ID propagation

### Phase 9-I-4

Design and implement write APIs:

- Solution selection write
- Item selection write
- Actual effort write
- Backend authoritative audit

## 15. Risks And Guardrails

| Risk | Guardrail |
| --- | --- |
| `owner_user_id` or `department_id` missing from project schema | Verify schema before implementing project scope lookup. |
| ProjectScopeService context cannot be built | Decide limited PoC scope explicitly; do not silently allow all project reads. |
| Domain API called while DB disabled | Return clear DB disabled/service unavailable error. |
| `effort_md` and `effort_mm` confusion | Use only `effort_mm` for standard effort backend contract. |
| `project_id` bigint treated as UUID | Keep `projectId` as numeric string or bigint-compatible value. |
| `active=false` meta exposed in estimation read API | Filter active meta for estimation endpoint; reserve inactive rows for admin API. |
| Inactive historical selection rows confuse frontend | Return active meta arrays and project selections separately; let service/frontend reconcile. |
| Read API accidentally calculates standard effort | Keep calculation out of read service. |
| Frontend adapter response shape mismatch | Return full input shape preferred by current `standardEffortApiAdapter`. |
| Logical reference validation skipped | Validate project and referenced meta rows in service/write phases. |
| Audit responsibility unclear | No read audit by default; write audit belongs to backend authoritative audit in write phases. |

## 16. Non-Goals In This Phase

- Backend Java source changes
- Controller implementation
- Service implementation
- Repository implementation
- SQL mapper implementation
- DB query execution
- Migration or seed changes
- ProjectRepository implementation
- StandardEffortController implementation
- Audit DB insert
- Frontend source changes
- Package dependency changes
