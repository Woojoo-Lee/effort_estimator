# Tomcat API Contract

## 1. Purpose

This document defines the API contract for moving the React/Vite frontend from
direct Supabase access to a Tomcat API backed by PostgreSQL.

Goals:

- Keep frontend repositories stable while replacing direct DB access with API adapters.
- Make Tomcat API the authoritative boundary for permission checks and audit logging.
- Define request/response payloads that match the current frontend adapter shape.
- Preserve the current database design rules: logical references, no physical foreign keys.

This document is a contract/specification only. It does not implement Tomcat
controllers, frontend adapters, migrations, or Jenkins pipelines.

## 2. Common Principles

### Response Wrapper

Successful responses:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "01HYREQABC..."
  }
}
```

Failed responses:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다.",
    "details": {},
    "request_id": "01HYREQABC..."
  }
}
```

Unauthorized example:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다.",
    "details": {},
    "request_id": "01HYREQABC..."
  }
}
```

Forbidden example:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다.",
    "details": {
      "required_permissions": ["project.write.all"]
    },
    "request_id": "01HYREQABC..."
  }
}
```

### HTTP Status and Error Code Mapping

| HTTP status | error.code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Request payload, parameter, or query validation failed. |
| 401 | `UNAUTHORIZED` | No valid session, JWT, or SSO identity. |
| 403 | `FORBIDDEN` | Authenticated actor lacks required permission/scope. |
| 404 | `NOT_FOUND` | Resource or logical reference was not found. |
| 409 | `CONFLICT` | Concurrent update, duplicate key, or version conflict. |
| 422 | `BUSINESS_RULE_VIOLATION` | Domain rule rejected the request. |
| 500 | `INTERNAL_ERROR` | Unexpected server error. |

### Request ID

- Every request must have a `request_id`.
- If the frontend sends `X-Request-Id`, the API should reuse it.
- If no request id is provided, Tomcat should generate one.
- All responses and audit rows should include the same `request_id`.

### Naming and Data Types

- API payloads use `snake_case`.
- `project_id` is PostgreSQL `bigint/int8`; JSON may use a finite number or a numeric string.
- Do not convert `project_id` to UUID.
- UUID-like ids such as `solution_variant_id`, `item_id`, and `user_id` are strings.
- Date/time values use ISO 8601 strings.
- Pagination is 1-based unless explicitly stated otherwise.

### Effort Units

- All effort values are M/M.
- Use these field names:
  - `effort_mm`
  - `actual_effort_mm`
  - `base_total_mm`
  - `standard_effort_mm`
  - `gap_mm`
- Do not use `effort_md` or `actual_effort_md` in new API responses.
- Do not perform M/D to M/M or M/M to M/D conversion.
- `coefficient` is unitless.

### Logical References

- The database design does not rely on physical foreign keys.
- The API/service layer must validate logical references.
- Examples:
  - `project_id` exists and is visible to the actor.
  - `solution_variant_id` exists.
  - `item_id` exists.
  - `solution_variant_id` and `item_id` are valid for standard effort operations.

### Pagination, Filter, and Sort

Collection endpoints should support:

- `page`: default `1`
- `page_size`: default `50`, server max recommended `200`
- `sort`: comma-separated fields, prefix `-` for descending
- filter query params named after snake_case fields

Paginated response `meta` example:

```json
{
  "request_id": "01HYREQABC...",
  "page": 1,
  "page_size": 50,
  "total_count": 123
}
```

## 3. Auth / Session

Tomcat API identifies the actor using the enterprise session/JWT/SSO mechanism.
The frontend-only guard is UX-only and is not a security boundary.

Current backend scaffold uses `app.security.mode=dev` only. Dev mode returns a
configured user and explicit configured permission codes. It does not integrate
SSO/JWT or query DB user/role/permission tables. A permission interceptor
skeleton exists for annotated endpoints, but current scaffold domain endpoints
are still not implemented. Dev mode must not be treated as production security.

### GET /api/me

Required auth: authenticated session.

Response:

```json
{
  "ok": true,
  "data": {
    "user_id": "user-uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "department_id": "dept-1",
    "role_codes": ["viewer"],
    "permission_codes": ["route.estimator.read"],
    "authenticated": true,
    "dev_only": true
  },
  "meta": {
    "request_id": "01HYREQABC..."
  }
}
```

### GET /api/me/permissions

Required auth: authenticated session.

Response:

```json
{
  "ok": true,
  "data": {
    "user": {
      "user_id": "user-uuid",
      "email": "user@example.com",
      "display_name": "User Name",
      "department_id": "dept-1",
      "role_codes": ["viewer"],
      "permission_codes": ["route.estimator.read"],
      "authenticated": true,
      "dev_only": true
    },
    "role_codes": ["viewer"],
    "permission_codes": ["route.estimator.read"],
    "permissions": ["route.estimator.read"],
    "dev_only": true
  },
  "meta": {
    "request_id": "01HYREQABC..."
  }
}
```

The response maps to the current frontend `authPermissionRepository` snapshot
shape. Tomcat must not depend on frontend guards for enforcement.

In scaffold dev mode, role codes do not automatically expand into permissions.
The configured permission list is authoritative for the response. Production
mode must replace this with SSO/session actor resolution and DB-backed
permission lookup.

The current backend skeleton provides `@RequirePermission` as an implementation
detail for endpoint-level permission checks. Method annotations override class
annotations, class annotations are used as fallback, and unannotated endpoints
are allowed. The interceptor checks explicit `permission_codes` only; role names
such as `system_admin` do not automatically grant permissions. Project scope
checks remain a future `ProjectScopeService` concern.

## 4. Permission Matrix

### Permission Codes

Route permissions:

- `route.estimator.read`
- `route.standard_effort_meta.read`
- `route.item_meta.read`
- `route.projects.read`

Standard effort permissions:

- `standard_effort.selection.write`
- `standard_effort.actual_effort.write`
- `standard_effort.refresh`

Standard effort meta permissions:

- `standard_effort_meta.base_effort.write`
- `standard_effort_meta.coefficient.write`
- `standard_effort_meta.active.write`
- `standard_effort_meta.validate.read`

Project permissions:

- `project.read.own`
- `project.read.department`
- `project.read.all`
- `project.write.own`
- `project.write.assigned`
- `project.write.all`

Export permissions:

- `export.read`
- `export.standard_effort`

Admin permissions:

- `user.manage`
- `role.manage`
- `audit.read`

### Endpoint Permission Table

| Endpoint | Required permission |
|---|---|
| `GET /api/me` | authenticated |
| `GET /api/me/permissions` | authenticated |
| `GET /api/standard-effort/meta` | `route.estimator.read` |
| `GET /api/projects/{projectId}/standard-effort` | `route.estimator.read` plus project read scope |
| `PUT /api/projects/{projectId}/standard-effort/solutions` | `standard_effort.selection.write` plus project write scope |
| `PUT /api/projects/{projectId}/standard-effort/items` | `standard_effort.selection.write` plus project write scope |
| `PUT /api/projects/{projectId}/standard-effort/actual-effort` | `standard_effort.actual_effort.write` plus project write scope |
| `POST /api/projects/{projectId}/standard-effort/recalculate` | `standard_effort.refresh` and `route.estimator.read` |
| `GET /api/standard-effort/admin/meta` | `route.standard_effort_meta.read` |
| `PUT /api/standard-effort/admin/base-effort/{solutionVariantId}` | `standard_effort_meta.base_effort.write` |
| `PUT /api/standard-effort/admin/coefficients/{itemId}` | `standard_effort_meta.coefficient.write` |
| `PUT /api/standard-effort/admin/solution-variants/{solutionVariantId}/active` | `standard_effort_meta.active.write` |
| `PUT /api/standard-effort/admin/items/{itemId}/active` | `standard_effort_meta.active.write` |
| `GET /api/standard-effort/admin/validation-summary` | `standard_effort_meta.validate.read` |
| `GET /api/projects` | project read scope; default excludes archived projects |
| `GET /api/projects?include_archived=true` | elevated project read scope for archived visibility |
| `GET /api/projects?status=archived` | elevated project read scope for archived visibility |
| `GET /api/projects/{projectId}` | project read scope |
| `POST /api/projects` | project write scope |
| `PUT /api/projects/{projectId}` | project write scope |
| `PUT /api/projects/{projectId}/archive` | project write scope, archive/delete action |
| `PUT /api/projects/{projectId}/restore` | project write scope, restore action |
| `DELETE /api/projects/{projectId}` | system-admin/admin-only hard delete candidate |
| `GET /api/projects/{projectId}/versions` | project read scope |
| `GET /api/projects/{projectId}/versions/latest` | project read scope |
| `POST /api/projects/{projectId}/versions` | project write scope |
| `GET /api/codebooks` | `route.item_meta.read`; write permission design pending |
| `GET /api/codebooks/rows` | `route.item_meta.read`; write permission design pending |
| `POST /api/codebooks` | codebook write permission candidate; system/meta admin policy pending |
| `PUT /api/codebooks/{id}` | codebook write permission candidate; system/meta admin policy pending |
| `PUT /api/codebooks/{id}/active` | codebook write permission candidate; system/meta admin policy pending |
| `GET /api/legacy-estimator/item-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| `GET /api/legacy-estimator/item-meta/rows` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| `GET /api/legacy-estimator/base-effort-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| `GET /api/legacy-estimator/item-field-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| `GET /api/legacy-estimator/env-var-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| `GET /api/legacy-estimator/calculation-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| `GET /api/legacy-estimator/policy` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| `GET /api/projects/{projectId}/standard-effort/export-data` | `export.read`, `export.standard_effort`, project read scope |
| `GET /api/projects/{projectId}/legacy/export-data` | `export.read`, project read scope |
| `GET /api/audit-logs` | `audit.read` |
| `GET /api/projects/{projectId}/standard-effort/export` | `export.read` and `export.standard_effort` plus project read scope |
| `GET /api/projects/{projectId}/legacy/export` | `export.read` plus project read scope |

Project scope must be checked by Tomcat. The frontend currently treats any
project write permission as a UX write grant, but backend scope must be precise.

### Project Scope Policy Skeleton

The backend scaffold now includes a pure `ProjectScopeService` decision
skeleton and a `ProjectContextService` DB lookup skeleton. The standard effort
project input read endpoint is wired through this boundary; future
project-bound endpoints should follow the same pattern by first loading project
ownership and assignment data through `ProjectContextService`, then passing the
resulting `ProjectAccessContext` to `ProjectScopeService`.

Current decision policy:

| Action | Allow policy |
|---|---|
| `READ` | `project.read.all`, or `project.read.department` with matching department, or `project.read.own` with matching owner. |
| `WRITE` | Deny archived projects first; otherwise allow `project.write.all`, matching `project.write.own`, or matching `project.write.assigned`. |
| `ARCHIVE` | Deny archived projects first; otherwise allow `project.write.all` only. |
| `RESTORE` | Allow `project.write.all` only. Archived state is a restore target concern, not a scope blocker in this skeleton. |

`project_id` remains bigint/int8-compatible and may be represented as a
numeric string. The skeleton preserves it as a string and does not convert it
to UUID. Role names such as `system_admin` do not grant project scope unless
the relevant `project.*` permission code is present.

Future implementation work must wire the lookup into domain endpoints, decide
department hierarchy policy if needed, and add service/controller integration.

Current `ProjectContextService` lookup caveat:

- `project_id` is validated as a numeric string and preserved as a string.
- `estimation_projects.id` is queried with `CAST(? AS bigint)`.
- Optional `owner_user_id` and `department_id` are read defensively and may be
  `null` on older schemas.
- `app_project_members` is used for assigned user ids when DB access is enabled.
- No Project CRUD API endpoint is exposed by this skeleton.

## 5. Standard Effort Calculation API

### A. GET /api/standard-effort/meta

Permission:

- `route.estimator.read`

Description:

- Returns calculation-screen metadata.
- Includes only active calculation metadata.
- Excludes inactive variants, items, and coefficients from calculation use.
- Implemented in the backend scaffold as the first Standard Effort read API.
- Requires DB access. If `app.db.enabled=false`, the endpoint returns
  `SERVICE_UNAVAILABLE` through the common error wrapper.
- Does not calculate standard effort.
- Does not query project selection tables.
- Does not write read audit rows by default.

Response `data`:

```json
{
  "solutions": [],
  "solution_variants": [],
  "base_effort_rows": [],
  "item_rows": [],
  "coefficient_rows": []
}
```

The backend DTOs may use Java camelCase fields, but Jackson serializes the
response as snake_case.

### B. GET /api/projects/{projectId}/standard-effort

Permission:

- `route.estimator.read`
- Project read scope: `project.read.own`, `project.read.department`, or `project.read.all`

Description:

- Returns a project's standard effort input.
- Full input shape is implemented in the backend scaffold because it minimizes
  frontend round trips.
- Calls `ProjectContextService.loadProjectAccessContext(projectId)`.
- Calls `ProjectScopeService.requireRead(context)`.
- Returns active standard effort metadata plus project selections.
- Does not calculate standard effort.
- Does not write read audit rows.

Response `data`:

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

Selection-only response is also accepted by the current frontend adapter:

```json
{
  "projectSolutionSelections": [],
  "projectItemSelections": []
}
```

### C. PUT /api/projects/{projectId}/standard-effort/solutions

Permission:

- `standard_effort.selection.write`
- Project write scope: `project.write.own`, `project.write.assigned`, or `project.write.all`

Request:

```json
{
  "project_id": "42",
  "selections": [
    {
      "project_id": "42",
      "solution_variant_id": "variant-pbx",
      "enabled": true,
      "actual_effort_mm": 3.5
    }
  ]
}
```

Response `data`:

```json
{
  "projectSolutionSelections": []
}
```

Rules:

- Store `enabled=false` instead of deleting rows.
- `actual_effort_mm` null, undefined, or empty string should normalize to `0`.
- Do not convert `project_id` to UUID.
- Validate project and solution variant logical references.
- Backend scaffold status: implemented.
- Route permission uses `standard_effort.selection.write`; `route.estimator.read`
  alone does not allow writes.
- Service applies `ProjectScopeService.requireWrite(context)`, so archived
  project writes are blocked by project scope policy.
- The backend writes authoritative `standard_effort.solution.toggle` audit
  through strict `AuditService.recordSuccess(...)`.
- `actual_effort_md` in the request is rejected.

### D. PUT /api/projects/{projectId}/standard-effort/items

Permission:

- `standard_effort.selection.write`
- Project write scope

Request:

```json
{
  "project_id": "42",
  "selections": [
    {
      "project_id": "42",
      "solution_variant_id": "variant-pbx",
      "item_id": "item-a",
      "checked": true
    }
  ]
}
```

Response `data`:

```json
{
  "project_item_selections": []
}
```

Rules:

- Store `checked=false` instead of deleting rows.
- API should normalize boolean-like checked values, but responses must return boolean.
- Validate active `solution_variant_id`, active `item_id`, and a matching active
  coefficient logical reference.
- Unknown checked strings return `VALIDATION_ERROR`.
- Request payloads containing `effort_mm`, `actual_effort_mm`,
  `actual_effort_md`, `standard_effort_mm`, or `gap_mm` are rejected.
- Backend scaffold status: implemented.
- Route permission uses `standard_effort.selection.write`; `route.estimator.read`
  alone does not allow writes.
- Service applies `ProjectScopeService.requireWrite(context)`, so archived
  project writes are blocked by project scope policy.
- The backend writes authoritative `standard_effort.item.check` audit through
  strict `AuditService.recordSuccess(...)`.

### E. PUT /api/projects/{projectId}/standard-effort/actual-effort

Permission:

- `standard_effort.actual_effort.write`
- Project write scope

Request:

```json
{
  "project_id": "42",
  "solution_variant_id": "variant-pbx",
  "actual_effort_mm": 4.5
}
```

Response `data`:

```json
{
  "project_solution_selection": {
    "project_id": "42",
    "solution_variant_id": "variant-pbx",
    "enabled": true,
    "actual_effort_mm": 4.5
  }
}
```

Rules:

- `actual_effort_mm` null, undefined, or empty string should normalize to `0`.
- `actual_effort_mm` must be non-negative and numeric.
- Request body must not include `enabled`, `effort_mm`, `actual_effort_md`,
  `standard_effort_mm`, or `gap_mm`.
- The server validates `solution_variant_id` against active solution variants.
- If the server creates a missing project solution selection row, it defaults
  `enabled=true`.
- Updates preserve the existing `enabled` value and only change
  `actual_effort_mm` plus `updated_at`.
- Response must use `actual_effort_mm`; M/D to M/M conversion is not performed.
- Backend scaffold status: implemented.
- Route permission uses `standard_effort.actual_effort.write`; selection write
  permission alone does not allow actual effort writes.
- Service applies `ProjectScopeService.requireWrite(context)`, so archived
  project writes are blocked by project scope policy.
- The backend writes authoritative `standard_effort.actual_effort.update` audit
  through strict `AuditService.recordSuccess(...)`.

### F. POST /api/projects/{projectId}/standard-effort/recalculate

Permission:

- `standard_effort.refresh`
- `route.estimator.read`

Description:

- Optional endpoint.
- Server-side preview of the same formula currently implemented by `calculateStandardEffort`.
- Useful when calculation authority moves from frontend to backend.

Response `data`:

```json
{
  "standardEffortResults": [],
  "totals": {}
}
```

## 6. Standard Effort Meta Admin API

### A. GET /api/standard-effort/admin/meta

Permission:

- `route.standard_effort_meta.read`

Description:

- Returns all admin metadata.
- Includes inactive rows.

Response `data`:

```json
{
  "solutions": [],
  "solutionVariants": [],
  "baseEffortRows": [],
  "itemRows": [],
  "coefficientRows": [],
  "summary": {}
}
```

The current frontend keeps `buildStandardEffortMetaSummary(meta)` as fallback
and does not require `summary` in the repository return shape.

### B. PUT /api/standard-effort/admin/base-effort/{solutionVariantId}

Permission:

- `standard_effort_meta.base_effort.write`

Request:

```json
{
  "solution_variant_id": "variant-pbx",
  "phase_rows": [
    {
      "phase_code": "analysis",
      "phase_name": "Analysis",
      "effort_mm": 1.5,
      "display_order": 10,
      "active": true
    }
  ]
}
```

Response `data`:

```json
{
  "baseEffortRows": []
}
```

Rules:

- Allowed `phase_code`: `analysis`, `design`, `implementation`, `test`, `deployment`.
- `effort_mm` must be a non-negative number.
- Empty `effort_mm` normalizes to `0`.
- No M/D to M/M conversion.

### C. PUT /api/standard-effort/admin/coefficients/{itemId}

Permission:

- `standard_effort_meta.coefficient.write`

Request:

```json
{
  "item_id": "item-a",
  "coefficient_rows": [
    {
      "solution_variant_id": "variant-pbx",
      "coefficient": 1.75,
      "active": true
    }
  ]
}
```

Response `data`:

```json
{
  "coefficientRows": []
}
```

Rules:

- `coefficient` must be a non-negative number.
- Empty `coefficient` normalizes to `0`.
- `coefficient` is unitless.
- Do not read or write `effort_mm` or `actual_effort_mm` in this endpoint.

### D. PUT /api/standard-effort/admin/solution-variants/{solutionVariantId}/active

Permission:

- `standard_effort_meta.active.write`

Request:

```json
{
  "solution_variant_id": "variant-pbx",
  "active": false
}
```

Response `data`:

```json
{
  "solutionVariant": {}
}
```

Rules:

- `active` must be boolean.
- Do not coerce `"true"` or `"false"` strings.
- Preserve `active=false` in admin responses.

### E. PUT /api/standard-effort/admin/items/{itemId}/active

Permission:

- `standard_effort_meta.active.write`

Request:

```json
{
  "item_id": "item-a",
  "active": false
}
```

Response `data`:

```json
{
  "item": {}
}
```

Rules:

- `active` must be boolean.
- Do not include effort or coefficient fields in the request.
- Preserve `active=false` in admin responses.

### F. GET /api/standard-effort/admin/validation-summary

Permission:

- `standard_effort_meta.validate.read`

Description:

- Optional endpoint.
- Initial frontend can continue using summary fallback.
- Backend implementation may return:
  - row counts
  - representative base totals
  - coefficient matrix completeness
  - fixture preview rows

Response `data`:

```json
{
  "summary": {}
}
```

## 7. Projects API

Project API adapter conversion is a future phase. Candidate endpoints:

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/projects` | project read scope; default excludes archived projects |
| GET | `/api/projects?include_archived=true` | elevated project read scope for archived visibility |
| GET | `/api/projects?status=active|archived` | project read scope for active, elevated project read scope for archived |
| GET | `/api/projects/{projectId}` | project read scope |
| POST | `/api/projects` | project write scope |
| PUT | `/api/projects/{projectId}` | project write scope |
| PUT | `/api/projects/{projectId}/archive` | project write scope, archive/delete action |
| PUT | `/api/projects/{projectId}/restore` | project write scope, restore action |
| DELETE | `/api/projects/{projectId}` | system-admin/admin-only hard delete candidate |
| GET | `/api/projects/{projectId}/versions` | project read scope |
| GET | `/api/projects/{projectId}/versions/latest` | project read scope |
| POST | `/api/projects/{projectId}/versions` | project write scope |
| POST | `/api/projects/{projectId}/versions/{versionId}/restore` | project write scope; future candidate |

Project read/write scope must be resolved on the backend using owner,
department, assigned member, or admin permission rules.

`GET /api/projects` should return active projects by default. Archived projects
are included only when explicitly requested and authorized:

- `include_archived=true`: return active and archived projects.
- `status=active`: return active projects.
- `status=archived`: return archived projects only.

When both `include_archived` and `status` are supplied, the backend should treat
`status` as the more specific filter. Archived project visibility should require
elevated project read scope such as `project.read.all` or an admin-equivalent
policy. `GET /api/projects/{projectId}` may return an archived project when the
caller has project read scope, but write operations against archived projects
should be restricted unless they are restore or admin workflows.

For normal user delete actions, archive/soft delete is recommended instead of
hard delete:

```json
{
  "project_id": "42"
}
```

`PUT /api/projects/{projectId}/archive` should preserve related standard effort
selections, project versions, project members, and audit references. It should
write authoritative `project.archive` audit in Tomcat. `DELETE
/api/projects/{projectId}` is reserved as a future hard delete candidate for
system-admin/admin-only workflows because this schema family intentionally does
not rely on physical project foreign keys.

Restore should use `PUT /api/projects/{projectId}/restore`:

```json
{
  "project_id": "42",
  "restore_reason": "user request"
}
```

`restore_reason` is optional. Empty restore reasons may be omitted by the
frontend adapter. The backend should validate that the caller has an elevated
restore-capable project write permission. The initial recommended policy is
`system_admin` or `project.write.all`; a dedicated `project.restore` permission
can be introduced in a later migration/seed phase if the operation needs
separate delegation.

Recommended restore row mutation:

- `status = 'active'`
- `archived_at = null`
- `archived_by = null`
- `archive_reason = null` unless the backend deliberately preserves it for
  display
- `updated_at = now()`

Restore history should be stored in authoritative audit logs rather than new
`restored_at`, `restored_by`, or `restore_reason` project columns at this stage.
Tomcat should write `project.restore` audit with archived-state `before_json`,
active-state `after_json`, `actor_user_id`, `project_id`, and metadata such as
`{ "section": "project_restore" }`.

Project version list should use `GET /api/projects/{projectId}/versions`.
The response should keep the legacy project payload separate from standard
effort selections:

```json
{
  "versions": [
    {
      "id": "version-1",
      "project_id": "42",
      "version_no": 3,
      "saved_type": "manual",
      "project_name": "Project A",
      "payload": {},
      "created_at": "2026-06-02T00:00:00.000Z"
    }
  ]
}
```

Latest version lookup should use `GET
/api/projects/{projectId}/versions/latest` and return either a row with
`version_no`, `latest_version_no`, or an equivalent numeric value. Frontend
adapters normalize that response back to the existing `{ data, error }` surface
with `data.version_no` available to the store.

Project version creation should use `POST
/api/projects/{projectId}/versions`:

```json
{
  "project_id": "42",
  "version_no": 4,
  "saved_type": "manual",
  "project_name": "Project A",
  "payload": {}
}
```

`payload` is the legacy project payload only. It must not include
`projectSolutionSelections`, `projectItemSelections`, or `actual_effort_mm`;
standard effort project data remains owned by the standard effort endpoints.
Tomcat should validate project read/write scope for version endpoints and write
authoritative `project.version.create` audit for version creation. Version
restore remains a future endpoint candidate and is not part of the current
frontend adapter implementation.

## 8. Codebooks / Common Code API

These endpoints back the existing common code repository surface. They keep
snake_case row shapes and the existing `{ data, error }` frontend adapter
surface. Legacy estimator metadata APIs are separate and documented in the next
section.

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/codebooks` | `route.item_meta.read` |
| GET | `/api/codebooks/rows` | `route.item_meta.read` |
| POST | `/api/codebooks` | codebook write permission candidate |
| PUT | `/api/codebooks/{id}` | codebook write permission candidate |
| PUT | `/api/codebooks/{id}/active` | codebook write permission candidate |

Read responses may use `codebooks`, `commonCodes`, `common_codes`, `rows`,
`data`, or a direct array. Row responses may use `row`, `commonCode`,
`common_code`, `data`, `rows[0]`, or a direct object.

Common code row shape:

```json
{
  "id": "1",
  "group_code": "solution",
  "code": "PBX",
  "code_name": "PBX",
  "code_value": "pbx",
  "description": "PBX solution",
  "sort_order": 10,
  "is_active": true,
  "created_at": "2026-06-02T00:00:00.000Z",
  "updated_at": "2026-06-02T00:00:00.000Z"
}
```

Create request:

```json
{
  "group_code": "solution",
  "code": "PBX",
  "code_name": "PBX",
  "code_value": "pbx",
  "description": "PBX solution",
  "sort_order": 10,
  "is_active": true
}
```

Update request:

```json
{
  "id": "1",
  "code_name": "PBX updated",
  "sort_order": 20,
  "is_active": true
}
```

Active update request:

```json
{
  "id": "1",
  "is_active": false
}
```

The frontend adapter normalizes missing create `sort_order` to `0` and missing
create `is_active` to `true`. If API responses use `active`, the frontend can
treat it as an `is_active` fallback while keeping the snake_case output key.
The active endpoint should require a boolean value and should not coerce
strings such as `"true"` or `"false"`.

No standard effort fields should be accepted in codebook request bodies:
`effort_mm`, `actual_effort_mm`, `standard_effort_mm`, and `gap_mm` are out of
scope for this domain.

Current permission constants do not yet define a dedicated codebook write
permission. A later migration/seed phase should choose one of these policies:

- introduce `codebook.write`
- introduce `item_meta.write`
- restrict writes to system/meta admin through backend policy

Tomcat should write authoritative audit for write endpoints. Candidate event
types:

- `codebook.create`
- `codebook.update`
- `codebook.active.update`

## 9. Legacy Estimator Meta API

These read-only endpoints back the existing legacy estimator metadata repository
surface. They are separate from standard effort metadata and must not introduce
standard effort `*_mm` fields into legacy rows.

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/legacy-estimator/item-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| GET | `/api/legacy-estimator/item-meta/rows` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| GET | `/api/legacy-estimator/base-effort-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| GET | `/api/legacy-estimator/item-field-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| GET | `/api/legacy-estimator/env-var-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| GET | `/api/legacy-estimator/calculation-meta` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |
| GET | `/api/legacy-estimator/policy` | `route.item_meta.read`; `legacy_estimator_meta.read` candidate |

Recommended response shape for list endpoints:

```json
{
  "rows": []
}
```

The frontend adapter also accepts domain-specific keys:

- `itemMeta`, `item_meta`, `itemMetaRows`, `item_meta_rows`
- `baseEffortMeta`, `base_effort_meta`
- `itemFieldMeta`, `item_field_meta`, `fieldMeta`, `field_meta`
- `envVarMeta`, `env_var_meta`
- `calculationMeta`, `calculation_meta`
- `policies`, `policy`, `row`, `rows`, `data`, and direct arrays

`fetchEstimationPolicy` preserves the existing Supabase-style array surface. If
Tomcat returns a single policy object through `policy`, `row`, `data`, or a
direct object, the frontend adapter wraps it into a one-row array.

Legacy metadata row example:

```json
{
  "id": "1",
  "solution_code": "PBX",
  "item_code": "call",
  "display_order": 10,
  "sort_order": 10,
  "is_active": true
}
```

Legacy effort-like fields such as `default_base_md`, `base_md`, and `effort_md`
may remain in this domain. Tomcat must preserve their names and values and must
not convert them to M/M. Standard effort fields such as `effort_mm`,
`actual_effort_mm`, `standard_effort_mm`, and `gap_mm` are owned by the standard
effort APIs and should not be added to legacy estimator metadata responses.

Read endpoints generally do not need audit rows. Tomcat should enforce the read
permission in middleware and keep logical reference validation in the
service/API layer. Legacy metadata write endpoints are not part of the current
contract.

## 10. Audit API / Policy

### Backend Audit Ownership

Operational API mode should not rely on browser-side audit inserts. Tomcat write
endpoints should write authoritative audit rows inside the backend transaction
or immediately after successful commit, depending on the final transaction
policy.

Frontend `POST /api/audit-logs` is not recommended for normal operation.

Current backend scaffold status:

- `AuditService` / `AuditRepository` skeleton exists.
- `JdbcAuditRepository` targets `public.app_audit_logs` when DB access is
  enabled.
- `AuditJson` redacts password/token/secret/authorization/key-like fields before
  JSONB storage.
- Strict audit methods fail when the repository is unavailable; best-effort
  audit returns `ok=false` instead of throwing.
- Standard Effort solution and item selection writes call strict backend
  success audit. Actual effort, project, meta admin, export, and audit read
  endpoints remain future backend work.

### GET /api/audit-logs

Permission:

- `audit.read`

Query params:

- `event_type`
- `actor_user_id`
- `project_id`
- `target_type`
- `target_id`
- `date_from`
- `date_to`
- `page`
- `page_size`

Response `data`:

```json
{
  "auditLogs": []
}
```

### Audit Event Types

- `project.create`
- `project.update`
- `project.archive`
- `project.restore`
- `project.version.create`
- `standard_effort.solution.toggle`
- `standard_effort.item.check`
- `standard_effort.actual_effort.update`
- `standard_effort.refresh`
- `standard_effort_meta.base_effort.update`
- `standard_effort_meta.coefficient.update`
- `standard_effort_meta.active.update`
- `export.download`
- `codebook.create`
- `codebook.update`
- `codebook.active.update`
- `role.assign`
- `role.revoke`

Additional future auth/project deletion events may be added when their domains
are implemented:

- `project.delete`
- `auth.login`
- `auth.logout`

### Audit Result And Target Types

`event_result` must be one of:

- `success`
- `failure`

Initial target types:

- `project`
- `project_version`
- `standard_effort`
- `standard_effort_meta`
- `codebook`
- `export`
- `user`
- `role`

### Frontend Audit Policy

Frontend env:

- `VITE_FRONTEND_AUDIT_MODE=auto|enabled|disabled|shadow`

Recommended values:

- Supabase development: `auto`
- API proof of concept: `shadow` or `disabled`
- Production API: `disabled`

In API production, backend audit is authoritative and frontend audit should be
disabled to avoid duplicate audit rows.

Shadow metadata example:

```json
{
  "audit_source": "frontend",
  "data_backend": "api",
  "frontend_shadow": true
}
```

## 11. Export API

Candidate endpoints:

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/projects/{projectId}/standard-effort/export-data` | `export.read`, `export.standard_effort`, project read scope |
| GET | `/api/projects/{projectId}/legacy/export-data` | `export.read`, project read scope |
| GET | `/api/projects/{projectId}/standard-effort/export` | `export.read`, `export.standard_effort`, project read scope |
| GET | `/api/projects/{projectId}/legacy/export` | `export.read`, project read scope |

Initial response option:

- JSON export payload consumed by frontend.

Later response options:

- File stream with `Content-Disposition`.
- Signed/internal download URL.

Backend should write `export.download` audit events when export succeeds.

Standard effort export data should keep standard effort M/M fields:

```json
{
  "project": {
    "id": "42",
    "project_name": "Project A",
    "status": "active",
    "updated_at": "2026-06-03T00:00:00.000Z"
  },
  "standard_effort": {
    "results": [
      {
        "solution_variant_id": "variant-1",
        "display_name": "PBX Avaya",
        "base_total_mm": 10,
        "coefficient_total": 1.5,
        "standard_effort_mm": 15,
        "actual_effort_mm": 12,
        "gap_mm": 3
      }
    ],
    "totals": {
      "base_total_mm": 10,
      "standard_effort_mm": 15,
      "actual_effort_mm": 12,
      "gap_mm": 3,
      "solution_count": 1
    }
  },
  "generated_at": "2026-06-03T00:00:00.000Z",
  "generated_by": {}
}
```

`standard_effort.results` rows should include these fields when available:

- `solution_variant_id`
- `display_name`
- `base_total_mm`
- `coefficient_total`
- `standard_effort_mm`
- `actual_effort_mm`
- `gap_mm`

`checked_items` rows should include checked item detail for standard effort
export workbooks:

```json
{
  "solution_variant_id": "variant-1",
  "item_id": "item-1",
  "category_l1": "Channel",
  "category_l2": "Voice",
  "item_name": "IVR",
  "item_option": "Basic",
  "coefficient": 1.2,
  "checked": true
}
```

`coefficient_total` and `checked_items[].coefficient` are unitless numeric
values. They must not be treated as M/M. `base_total_mm`,
`standard_effort_mm`, `actual_effort_mm`, and `gap_mm` must remain M/M values.

`GET /api/projects/{projectId}/standard-effort/export-data` may accept
`include_checked_items=false` to omit detailed checked item rows. The default
server behavior may include checked item detail.

The frontend can convert this JSON payload into a workbook-ready sheet model
with summary rows, solution result rows, and checked item rows before creating
an XLSX file. The sheet mapper keeps M/M labels on effort fields only and keeps
coefficient values unitless.

The current frontend workbook path is a two-step client-side strategy:

1. `GET /api/projects/{projectId}/standard-effort/export-data` returns JSON.
2. The frontend maps that JSON to sheet rows and creates an XLSX workbook.

The frontend orchestration helper for this path calls the export-data repository
first, then builds `{ workbook, buffer, filename, sheets }` from the returned
JSON. It does not perform the actual browser download; that UI/download wiring
remains a separate frontend phase.

The browser download layer is also frontend-owned for this strategy: workbook
buffers can be converted to Blob objects, downloaded through object URLs, and
revoked after the click is triggered. This is separate from the later
backend-owned file stream endpoint.

A frontend execution helper can combine the export-data fetch, workbook
creation, and browser download helpers. That helper is frontend orchestration,
not a Tomcat API contract, and it still depends on Tomcat enforcing export
permissions on the export-data endpoint.

This strategy does not require Tomcat to stream a file yet. The later file
stream strategy through `GET /api/projects/{projectId}/standard-effort/export`
can be implemented when backend-owned report generation is preferred.

Legacy export data should keep the legacy project payload and should not mix in
standard effort selection or `*_mm` payloads. Standard effort export should not
convert M/M fields to M/D, and legacy export should not convert legacy
md/md-like fields to M/M.

Recommended authoritative audit metadata:

```json
{
  "export_type": "standard_effort",
  "format": "json",
  "mode": "json_payload"
}
```

Tomcat should enforce `export.read`, `export.standard_effort`, and project read
scope for standard effort export-data. The frontend adapter does not enforce
these permissions beyond UX guards.

## 12. Error Code Catalog

| code | Recommended message behavior |
|---|---|
| `UNAUTHORIZED` | Ask user to sign in again. |
| `FORBIDDEN` | "접근 권한이 없습니다." |
| `NOT_FOUND` | Resource not found or inaccessible. |
| `VALIDATION_ERROR` | Include field-level `details`. |
| `CONFLICT` | Include current version or conflicting key when useful. |
| `BUSINESS_RULE_VIOLATION` | Include business rule identifier in `details`. |
| `INTERNAL_ERROR` | Do not expose internal stack traces. |

## 13. Migration / DB Ownership

- Tomcat API validates logical references.
- Physical FK constraints are intentionally not required by this design.
- Browser direct DB access should be removed in the final operating model.
- DB access should use API service accounts with the minimum required grants.
- Migrations remain a controlled deployment step, not a browser responsibility.

## 14. Tomcat Implementation Notes

- Add request id filter before auth and controller execution.
- Add session/JWT/SSO integration before permission middleware.
- Add permission middleware per endpoint.
- Add audit interceptor/service for write endpoints.
- Use DB transactions for multi-row writes.
- Make audit write policy explicit: same transaction or post-commit durable write.
- Configure connection pool for PostgreSQL.
- Keep JSON serialization in snake_case.
- Use ISO 8601 and a single backend timezone policy.
- Define CORS and CSRF policy for browser sessions.
- Store secrets outside the frontend build artifact.

## 15. Frontend Adapter Mapping

| Frontend adapter | Endpoint mapping status |
|---|---|
| `standardEffortApiAdapter.fetchStandardEffortMeta` | `GET /api/standard-effort/meta` |
| `standardEffortApiAdapter.fetchProjectStandardSelections` | `GET /api/projects/{projectId}/standard-effort` |
| `standardEffortApiAdapter.fetchStandardEffortInput` | Uses project standard effort endpoint, optionally meta endpoint |
| `standardEffortApiAdapter.upsertProjectSolutionSelections` | `PUT /api/projects/{projectId}/standard-effort/solutions` |
| `standardEffortApiAdapter.upsertProjectItemSelections` | `PUT /api/projects/{projectId}/standard-effort/items` |
| `standardEffortApiAdapter.updateProjectActualEffort` | `PUT /api/projects/{projectId}/standard-effort/actual-effort` |
| `standardEffortMetaApiAdapter.fetchStandardEffortMetaAdmin` | `GET /api/standard-effort/admin/meta` |
| `standardEffortMetaApiAdapter.upsertStandardBaseEffortRows` | `PUT /api/standard-effort/admin/base-effort/{solutionVariantId}` |
| `standardEffortMetaApiAdapter.upsertStandardCoefficientRows` | `PUT /api/standard-effort/admin/coefficients/{itemId}` |
| `standardEffortMetaApiAdapter.updateStandardSolutionVariantActive` | `PUT /api/standard-effort/admin/solution-variants/{solutionVariantId}/active` |
| `standardEffortMetaApiAdapter.updateStandardItemActive` | `PUT /api/standard-effort/admin/items/{itemId}/active` |
| `projectApiAdapter` project read/save/archive/restore/version | Project endpoints |
| `projectApiAdapter` codebook/common code | `/api/codebooks`, `/api/codebooks/rows`, `/api/codebooks/{id}` |
| `projectApiAdapter` legacy estimator meta | `/api/legacy-estimator/...` read endpoints |
| future `authPermissionApiAdapter` | `/api/me`, `/api/me/permissions`, user/role endpoints |
| future `auditLogApiAdapter` | Audit read endpoint only; frontend audit write not recommended |

## 16. Rollout

### Development

```env
VITE_DATA_BACKEND=supabase
VITE_FRONTEND_AUDIT_MODE=auto
```

### API Proof of Concept

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=https://api.example.internal
VITE_FRONTEND_AUDIT_MODE=shadow
```

or:

```env
VITE_FRONTEND_AUDIT_MODE=disabled
```

### Production API

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=https://api.company.internal
VITE_FRONTEND_AUDIT_MODE=disabled
```

### Rollback Strategy

- Keep Supabase adapters as default until API mode is proven.
- Roll frontend back by setting `VITE_DATA_BACKEND=supabase` and rebuilding.
- Keep backend write ownership clear; avoid prolonged Supabase/API dual-write.
- Do not use API mode operationally until permission middleware and backend
  audit are implemented.
