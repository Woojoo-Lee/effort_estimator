# Standard Effort Write API Design

## 1. Purpose

This document fixes the design boundary for the Standard Effort write APIs
before backend Java write endpoints are implemented.

Goals:

- Align Tomcat write APIs with the existing frontend `standardEffortApiAdapter`
  write contract.
- Define permission, project scope, transaction, audit, validation, and SQL
  behavior before implementation.
- Keep Tomcat as the authoritative permission and audit boundary in API mode.
- Preserve database design rules: logical references, no physical FK reliance,
  `project_id` as bigint/int8, Standard Effort values as M/M, and snake_case
  JSON.

This document is design only. It does not implement controllers, services,
repositories, audit inserts, transaction code, migrations, seeds, or frontend
changes.

## 2. Target APIs

Write APIs covered by this design:

- `PUT /api/projects/{projectId}/standard-effort/solutions`
- `PUT /api/projects/{projectId}/standard-effort/items`
- `PUT /api/projects/{projectId}/standard-effort/actual-effort`

Future candidate:

- `POST /api/projects/{projectId}/standard-effort/recalculate`

Recommended implementation order:

1. Solution selection write.
2. Item selection write.
3. `actual_effort_mm` write.
4. Recalculate preview, only after server-side calculation ownership is decided.

## 3. Common Write Flow

All Standard Effort write endpoints should follow the same high-level flow:

1. Enforce route-level permission with `@RequirePermission`.
2. Validate `projectId` as a bigint-compatible numeric string.
3. Load project context with `ProjectContextService.loadProjectAccessContext(projectId)`.
4. Enforce project write scope with `ProjectScopeService.requireWrite(context)`.
5. Rely on `ProjectScopeService` to block writes to archived projects.
6. Validate and normalize the request body.
7. Validate logical references in the service/repository layer.
8. Start a request-level transaction.
9. Read before state for rows affected by the request.
10. Run upsert/update SQL.
11. Read after state or return saved rows from SQL.
12. Write authoritative audit through `AuditService.recordSuccess(...)`.
13. Return `ApiResponse.ok(data, requestId)`.

Common error flow:

| Condition | HTTP status | error.code |
|---|---:|---|
| Request validation failure | 400 | `VALIDATION_ERROR` |
| Project not found | 404 | `NOT_FOUND` |
| Missing route permission | 403 | `FORBIDDEN` |
| Project scope denied | 403 | `FORBIDDEN` |
| Archived project write blocked | 403 | `FORBIDDEN` |
| DB disabled / repository unavailable | 503 | `SERVICE_UNAVAILABLE` |
| Unexpected DB failure | 500 | `INTERNAL_ERROR` or future `DB_ERROR` |

Read endpoints do not write audit rows by default. These write endpoints should
write backend authoritative audit rows once audit infrastructure exists.

## 4. Permission Policy

### Solution Selection Write

Endpoint:

```http
PUT /api/projects/{projectId}/standard-effort/solutions
```

Implementation status: completed in the backend scaffold.

Required checks:

- `@RequirePermission(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)`
- `ProjectScopeService.requireWrite(context)`

### Item Selection Write

Endpoint:

```http
PUT /api/projects/{projectId}/standard-effort/items
```

Implementation status: completed in the backend scaffold.

Required checks:

- `@RequirePermission(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)`
- `ProjectScopeService.requireWrite(context)`

### Actual Effort Write

Endpoint:

```http
PUT /api/projects/{projectId}/standard-effort/actual-effort
```

Required checks:

- `@RequirePermission(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)`
- `ProjectScopeService.requireWrite(context)`

### Recalculate Candidate

Endpoint:

```http
POST /api/projects/{projectId}/standard-effort/recalculate
```

Candidate checks:

- `@RequirePermission(PermissionCodes.STANDARD_EFFORT_REFRESH)`
- Project read scope or write scope, to be decided when server-side calculation
  authority is introduced.

Important rules:

- `route.estimator.read` alone must never allow writes.
- Project write permissions are evaluated by `ProjectScopeService`, not by the
  controller.
- Role names such as `system_admin` do not grant access unless the matching
  permission codes are present.
- Permission checks use explicit `permission_codes`.

## 5. Solution Selection Write

Endpoint:

```http
PUT /api/projects/{projectId}/standard-effort/solutions
```

Request:

```json
{
  "project_id": "42",
  "selections": [
    {
      "project_id": "42",
      "solution_variant_id": "uuid-or-string",
      "enabled": true,
      "actual_effort_mm": 0
    }
  ]
}
```

Request rules:

- Path `projectId` is authoritative.
- If body `project_id` is present, it must match path `projectId`.
- If body `project_id` is missing, the service may inject the path value.
- Each row must include `solution_variant_id`.
- Missing `enabled` should normalize to `true`.
- Missing, null, or empty `actual_effort_mm` should normalize to `0`.
- New backend write API should not accept `actual_effort_md` as a fallback.
- `actual_effort_mm` should be a non-negative numeric value.
- Duplicate `solution_variant_id` rows in the same request should be rejected
  with `VALIDATION_ERROR`.

Logical validation:

- `project_id` must exist and pass project write scope.
- `solution_variant_id` must identify an active solution variant for calculation
  screen writes.
- Writes to inactive variants should be rejected in this endpoint; admin meta
  workflows own inactive rows.

SQL sketch:

```sql
INSERT INTO public.estimation_project_solution_selection (
  project_id,
  solution_variant_id,
  enabled,
  actual_effort_mm,
  updated_at
)
VALUES (
  CAST(? AS bigint),
  CAST(? AS uuid),
  ?,
  ?,
  now()
)
ON CONFLICT (project_id, solution_variant_id)
DO UPDATE SET
  enabled = EXCLUDED.enabled,
  actual_effort_mm = EXCLUDED.actual_effort_mm,
  updated_at = now()
RETURNING
  project_id::text AS project_id,
  solution_variant_id::text AS solution_variant_id,
  enabled,
  actual_effort_mm,
  created_at,
  updated_at;
```

Notes:

- Keep `project_id` as bigint/int8 and expose it as string in JSON.
- Keep `solution_variant_id` as API string; if the DB column is UUID, validate
  syntax before SQL so invalid UUIDs return `VALIDATION_ERROR` instead of a raw
  DB exception.
- Do not rely on physical FK constraints. Validate logical references.
- Use `actual_effort_mm`; do not use `actual_effort_md`.
- Do not perform M/D to M/M conversion.
- Backend implementation uses `ProjectContextService.loadProjectAccessContext`,
  `ProjectScopeService.requireWrite`, active variant validation, before-state
  lookup, row-loop `INSERT ... ON CONFLICT ... RETURNING`, and strict backend
  audit.

Recommended response:

```json
{
  "project_solution_selections": []
}
```

The frontend adapter can tolerate `selections` or `rows`, but the backend
contract should prefer `project_solution_selections`.

Audit design:

- `event_type`: `standard_effort.solution.toggle`
- `target_type`: `standard_effort`
- `target_id`: batch target or `{projectId}:{solutionVariantId}`
- `project_id`: path project id
- `before_json`: previous rows for the affected variant ids
- `after_json`: saved rows
- `metadata_json`:

```json
{
  "section": "solution_selection",
  "unit": "M/M"
}
```

Current implementation:

- Calls `AuditService.recordSuccess(...)`.
- Uses `target_id = projectId + ":solutions"` for batch writes.
- Includes `project_solution_selections` in both `before_json` and `after_json`.
- Adds `row_count` to metadata.
- Propagates audit failures. When a transaction manager is available, write and
  success audit run in the same `TransactionTemplate` callback.

## 6. Item Selection Write

Endpoint:

```http
PUT /api/projects/{projectId}/standard-effort/items
```

Request:

```json
{
  "project_id": "42",
  "selections": [
    {
      "project_id": "42",
      "solution_variant_id": "uuid-or-string",
      "item_id": "uuid-or-string",
      "checked": true
    }
  ]
}
```

Request rules:

- Path `projectId` is authoritative.
- If body `project_id` is present, it must match path `projectId`.
- Each row must include `solution_variant_id`.
- Each row must include `item_id`.
- `checked` normalization:
  - `true`, `1`, `"1"`, `"Y"`, and `"true"` normalize to `true`.
  - `false`, `0`, `"0"`, `"N"`, `"false"`, null, undefined, and empty string
    normalize to `false`.
- Duplicate `(solution_variant_id, item_id)` rows in the same request should be
  rejected with `VALIDATION_ERROR`.
- Unknown checked strings are rejected with `VALIDATION_ERROR`.
- Request rows must not include `effort_mm`, `actual_effort_mm`,
  `actual_effort_md`, `standard_effort_mm`, or `gap_mm`.

Logical validation:

- `solution_variant_id` should identify an active solution variant.
- `item_id` should identify an active standard item.
- A matching active coefficient row for `(item_id, solution_variant_id)` should
  exist. Missing coefficient rows should be rejected with `VALIDATION_ERROR`
  because the calculation input would be incomplete.

SQL sketch:

```sql
INSERT INTO public.estimation_project_item_solution_selection (
  project_id,
  solution_variant_id,
  item_id,
  checked,
  updated_at
)
VALUES (
  CAST(? AS bigint),
  CAST(? AS uuid),
  CAST(? AS uuid),
  ?,
  now()
)
ON CONFLICT (project_id, solution_variant_id, item_id)
DO UPDATE SET
  checked = EXCLUDED.checked,
  updated_at = now()
RETURNING
  project_id::text AS project_id,
  solution_variant_id::text AS solution_variant_id,
  item_id::text AS item_id,
  checked,
  created_at,
  updated_at;
```

Recommended response:

```json
{
  "project_item_selections": []
}
```

Audit design:

- `event_type`: `standard_effort.item.check`
- `target_type`: `standard_effort`
- `target_id`: batch target or `{projectId}:{solutionVariantId}:{itemId}`
- `project_id`: path project id
- `before_json`: previous rows for affected composite keys
- `after_json`: saved rows
- `metadata_json`:

```json
{
  "section": "item_selection"
}
```

Current implementation:

- Calls `ProjectContextService.loadProjectAccessContext(projectId)`.
- Calls `ProjectScopeService.requireWrite(context)`.
- Validates active solution variant, active standard item, and active
  coefficient logical references.
- Uses row-loop `INSERT ... ON CONFLICT ... RETURNING`.
- Calls strict `AuditService.recordSuccess(...)`.
- Uses `target_id = projectId + ":items"` for batch writes.
- Includes `project_item_selections` in both `before_json` and `after_json`.
- Adds `row_count` to metadata.
- Propagates audit failures. When a transaction manager is available, write and
  success audit run in the same `TransactionTemplate` callback.

## 7. Actual Effort Write

Endpoint:

```http
PUT /api/projects/{projectId}/standard-effort/actual-effort
```

Request:

```json
{
  "project_id": "42",
  "solution_variant_id": "uuid-or-string",
  "actual_effort_mm": 12.5
}
```

Request rules:

- Path `projectId` is authoritative.
- If body `project_id` is present, it must match path `projectId`.
- `solution_variant_id` is required.
- Missing, null, or empty `actual_effort_mm` should normalize to `0`.
- `actual_effort_mm` must be non-negative.
- Request body should not include `enabled`.
- If the row does not exist, the server may create it with `enabled = true`.
- If the row exists, updating actual effort should preserve existing `enabled`.
- `actual_effort_md` should not be accepted in backend write API.

Logical validation:

- `project_id` must exist and pass project write scope.
- `solution_variant_id` must identify an active solution variant.

SQL sketch:

```sql
INSERT INTO public.estimation_project_solution_selection (
  project_id,
  solution_variant_id,
  enabled,
  actual_effort_mm,
  updated_at
)
VALUES (
  CAST(? AS bigint),
  CAST(? AS uuid),
  true,
  ?,
  now()
)
ON CONFLICT (project_id, solution_variant_id)
DO UPDATE SET
  actual_effort_mm = EXCLUDED.actual_effort_mm,
  updated_at = now()
RETURNING
  project_id::text AS project_id,
  solution_variant_id::text AS solution_variant_id,
  enabled,
  actual_effort_mm,
  created_at,
  updated_at;
```

Recommended response:

```json
{
  "project_solution_selection": {}
}
```

Audit design:

- `event_type`: `standard_effort.actual_effort.update`
- `target_type`: `standard_effort`
- `target_id`: `{projectId}:{solutionVariantId}`
- `project_id`: path project id
- `before_json`:

```json
{
  "actual_effort_mm": 10
}
```

- `after_json`:

```json
{
  "actual_effort_mm": 12.5
}
```

- `metadata_json`:

```json
{
  "section": "actual_effort",
  "unit": "M/M"
}
```

## 8. Transaction Boundary

Recommended boundary:

- One transaction per write API request.
- Project context lookup and permission checks may happen before the write
  transaction, but affected-row before state, write, after state, and success
  audit should be consistent.
- Logical reference validation may happen before or inside the transaction. If
  references can change concurrently, validate inside the transaction.
- Prefer one transaction for before state + write + after state + success audit.

Audit failure policy options:

| Policy | Behavior | Tradeoff |
|---|---|---|
| Same transaction rollback | Business write rolls back if authoritative audit insert fails. | Strong audit guarantee; audit outage blocks writes. |
| Post-commit best effort | Business write succeeds even if audit insert fails. | Better availability; weaker authoritative audit guarantee. |
| Outbox table | Write business row and audit intent atomically, process later. | Stronger durability; more infrastructure. |

Initial recommendation:

- Implement same-transaction success audit for write endpoints when
  `AuditService` is introduced.
- Define failure audit separately as best-effort because failed validation and
  permission checks may occur before a write transaction exists.
- Do not implement write endpoints as "audit TODO" in production mode. If a PoC
  needs write endpoints before audit, mark that mode explicitly non-operational.

## 9. AuditService Design

Candidate service methods:

- `recordStandardEffortSolutionToggle(...)`
- `recordStandardEffortItemCheck(...)`
- `recordStandardEffortActualEffortUpdate(...)`
- Generic `recordSuccess(AuditEvent event)`

Candidate repository:

- `AuditRepository.insert(...)` into `public.app_audit_logs`

Current backend scaffold status:

- `AuditService`, `AuditRepository`, `JdbcAuditRepository`, `AuditCommand`,
  `AuditRecord`, and `AuditWriteResult` are implemented.
- `AuditJson` serializes audit payloads and redacts sensitive keys before JSONB
  insert.
- Strict audit methods throw when the repository is unavailable.
- `recordBestEffort(...)` returns `ok=false` on failure.
- Standard Effort solution and item selection write endpoints call strict
  `AuditService.recordSuccess(...)`.

Required audit context:

- `request_id`
- actor user id
- `project_id`
- event type
- target type
- target id
- `before_json`
- `after_json`
- `metadata_json`
- optional IP and user agent

Request data sources:

- Actor comes from `CurrentUserProvider`.
- Request id comes from `RequestIdFilter`.
- IP/user agent can be captured in controller, request context, or a future
  request-scoped audit context holder.

Frontend audit policy:

- In API production, frontend audit should be disabled.
- Backend audit is authoritative.
- Shadow frontend audit is useful only during PoC comparison and must be
  filtered out of operational reports.

## 10. Repository Method Design

Candidate `StandardEffortRepository` write methods:

```java
List<ProjectSolutionSelectionDto> upsertProjectSolutionSelections(
    String projectId,
    List<ProjectSolutionSelectionDto> rows
);

List<ProjectItemSelectionDto> upsertProjectItemSelections(
    String projectId,
    List<ProjectItemSelectionDto> rows
);

ProjectSolutionSelectionDto updateProjectActualEffort(
    String projectId,
    String solutionVariantId,
    BigDecimal actualEffortMm
);
```

Candidate validation/helper methods:

```java
boolean activeSolutionVariantExists(String solutionVariantId);

boolean activeItemExists(String itemId);

boolean activeCoefficientExists(String itemId, String solutionVariantId);

List<ProjectSolutionSelectionDto> findProjectSolutionSelectionsByVariantIds(
    String projectId,
    List<String> solutionVariantIds
);

List<ProjectItemSelectionDto> findProjectItemSelectionsByKeys(
    String projectId,
    List<ProjectItemSelectionKey> keys
);
```

Implementation notes:

- `JdbcTemplate.batchUpdate` does not naturally return `RETURNING` rows.
- For early implementation, either loop `INSERT ... RETURNING` rows or write
  then run a follow-up select for affected keys.
- Avoid new dependencies unless a later phase explicitly allows them.
- Keep SQL explicit and avoid nested FK joins.

## 11. Service Method Design

Candidate `StandardEffortService` methods:

```java
ProjectSolutionSelectionsResponse saveProjectSolutionSelections(
    String projectId,
    SaveProjectSolutionSelectionsRequest request
);

ProjectItemSelectionsResponse saveProjectItemSelections(
    String projectId,
    SaveProjectItemSelectionsRequest request
);

ProjectSolutionSelectionResponse updateProjectActualEffort(
    String projectId,
    UpdateProjectActualEffortRequest request
);
```

Common service responsibilities:

- Validate path/body `project_id`.
- Load project context.
- Call `ProjectScopeService.requireWrite(context)`.
- Normalize request rows.
- Reject duplicates.
- Validate logical references.
- Read before state.
- Write rows through repository.
- Read after state or use returned saved rows.
- Write audit.
- Return response DTOs with snake_case JSON names.

The service should not calculate standard effort in these write methods.

## 12. Controller DTO Design

Candidate request DTOs:

- `SaveProjectSolutionSelectionsRequest`
- `ProjectSolutionSelectionRequest`
- `SaveProjectItemSelectionsRequest`
- `ProjectItemSelectionRequest`
- `UpdateProjectActualEffortRequest`

Candidate response DTOs:

- `ProjectSolutionSelectionsResponse`
- `ProjectItemSelectionsResponse`
- `ProjectSolutionSelectionResponse`

JSON naming:

- Java fields may be camelCase.
- Jackson should serialize and deserialize snake_case.
- API contract keys should be:
  - `project_id`
  - `solution_variant_id`
  - `item_id`
  - `actual_effort_mm`
  - `project_solution_selections`
  - `project_item_selections`
  - `project_solution_selection`

## 13. Error Handling

Validation errors:

- Missing `project_id` when required.
- Path/body `project_id` mismatch.
- Missing `solution_variant_id`.
- Missing `item_id`.
- Duplicate request row.
- Negative `actual_effort_mm`.
- Invalid id syntax when UUID syntax validation is chosen.
- Inactive or missing variant/item/coefficient logical reference.

Error mapping:

| Case | HTTP status | error.code |
|---|---:|---|
| Request validation failure | 400 | `VALIDATION_ERROR` |
| Project missing | 404 | `NOT_FOUND` |
| Missing route permission | 403 | `FORBIDDEN` |
| Project write scope denied | 403 | `FORBIDDEN` |
| Archived project write blocked | 403 | `FORBIDDEN` |
| DB disabled | 503 | `SERVICE_UNAVAILABLE` |
| Unexpected DB failure | 500 | `INTERNAL_ERROR` or future `DB_ERROR` |

## 14. Test Strategy

Pure/unit tests:

- request normalization
- `checked` boolean normalization
- `actual_effort_mm` normalization
- duplicate row detection
- path/body `project_id` matching
- logical validation errors

Repository tests:

- SQL contains `actual_effort_mm`.
- SQL does not contain `actual_effort_md`.
- SQL uses `project_id = CAST(? AS bigint)`.
- SQL returns `project_id::text`.
- Returning row mapping preserves string ids.
- Batch/write behavior or follow-up select behavior is verified without real DB.

Service tests:

- `ProjectContextService.loadProjectAccessContext(projectId)` is called.
- `ProjectScopeService.requireWrite(context)` is called.
- Archived project denial propagates.
- Validation errors are thrown before repository writes.
- Before/after rows are passed to audit.
- Repository write is called only after permission/scope validation.
- Audit failure behavior matches the chosen transaction policy.

Controller tests:

- Permission annotations are enforced.
- System admin role-only remains denied without permission codes.
- Request/response JSON is snake_case.
- Common error wrappers are returned for validation, permission, scope, project
  not found, and DB disabled cases.

Integration smoke tests:

- With DB enabled and seed data applied, solution toggle persists.
- Item check persists.
- Actual effort persists.
- Frontend API adapter write paths work against Tomcat.
- Read endpoint returns the changed rows afterward.

## 15. Implementation Order Proposal

### Phase 9-I-5

- Completed: `AuditService` and `AuditRepository` skeleton for future Standard
  Effort write events.
- Completed: `JdbcAuditRepository` insert boundary for `public.app_audit_logs`.
- Completed: strict vs best-effort audit behavior in code.
- Still deferred: transaction integration and domain write endpoint calls.

### Phase 9-I-6

- Completed: solution selection write API.
- Endpoint: `PUT /api/projects/{projectId}/standard-effort/solutions`.
- Completed: route permission, project write scope, active variant validation,
  `actual_effort_mm` request validation, repository upsert, before/after audit
  payload, and strict success audit.
- Still deferred: actual effort write, recalculation, and frontend
  source changes.

### Phase 9-I-7

- Completed: item selection write API.
- Endpoint: `PUT /api/projects/{projectId}/standard-effort/items`.
- Applied route permission, project write scope, checked normalization,
  forbidden effort-field validation, active variant/item/coefficient logical
  validation, before-state lookup, item upsert, transaction wrapper, and strict
  success audit.
- Still deferred: actual effort write, recalculation, and frontend source
  changes.

### Phase 9-I-8

- Completed: `actual_effort_mm` write API.
- Endpoint: `PUT /api/projects/{projectId}/standard-effort/actual-effort`.
- Applied route permission, project write scope, active variant validation,
  forbidden-field validation, `actual_effort_mm` normalization, before-state
  lookup, upsert, transaction wrapper, and strict success audit.
- Preserves existing `enabled` on update and defaults `enabled=true` on insert.
- Still deferred: server-side recalculation and frontend source changes.

### Phase 9-I-9

- Run integration smoke with frontend API adapter write paths.
- Verify backend authoritative audit rows.
- Keep frontend audit disabled or shadowed in API mode.

## 16. Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Write endpoints ship without authoritative audit | Implement audit skeleton first or clearly mark write PoC as non-operational. |
| Archived project writes slip through | Always call `ProjectScopeService.requireWrite(context)` before repository writes. |
| `actual_effort_md` reappears | Reject MD fields in request DTOs and assert SQL/DTO tests use only `actual_effort_mm`. |
| `project_id` treated as UUID | Validate numeric string and keep SQL `CAST(? AS bigint)`. |
| Inactive meta receives calculation-screen writes | Validate active variant/item/coefficient references before writes. |
| Batch upsert with `RETURNING` becomes complex | Start with looped `INSERT ... RETURNING` or write plus follow-up select. |
| Duplicate rows in request have ambiguous behavior | Reject duplicates with `VALIDATION_ERROR`. |
| Logical reference validation is skipped | Add repository/service tests for missing/inactive references. |
| Audit failure rollback policy is unclear | Pick same-transaction success audit before endpoint implementation. |
| Frontend optimistic merge mismatches backend response | Return stable snake_case keys preferred by the API contract. |
| DB disabled write request gives unclear error | Reuse `ServiceUnavailableException` and `SERVICE_UNAVAILABLE` wrapper. |
