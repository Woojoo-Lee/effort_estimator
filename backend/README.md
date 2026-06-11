# Effort API Backend

Spring Boot 3.x WAR scaffold for the future Tomcat API.

This scaffold currently includes only:

- common response/error wrapper types
- request id filter
- `/api/health`
- optional JDBC/PostgreSQL connectivity skeleton
- `/api/internal/db-health`
- dev-mode auth/permission response skeleton
- `/api/me`
- `/api/me/permissions`
- permission interceptor skeleton
- `@RequirePermission`
- project scope decision skeleton
- project context lookup skeleton
- standard effort active meta read endpoint
- standard effort project input read endpoint
- standard effort solution selection write endpoint
- standard effort item selection write endpoint
- standard effort actual-effort write endpoint
- standard effort active meta JDBC repository
- authoritative audit service/repository skeleton
- `app_audit_logs` insert boundary for future backend write endpoints
- global exception wrapper
- health controller test

It intentionally does not include:

- MyBatis, JPA, or Flyway
- domain SQL repositories beyond standard effort active meta read
- SSO, JWT, OIDC, or SAML integration
- DB-backed user, role, or permission lookup
- project API or project CRUD
- audit read API
- project, standard effort meta, export, or other domain endpoints
- Jenkinsfile

## Local Build

```powershell
mvn test
mvn package
```

The WAR artifact is produced at:

```text
target/effort-api.war
```

## Database Connectivity Skeleton

Database connectivity is disabled by default so the common web scaffold can
test and package without a local PostgreSQL instance.

```env
APP_DB_ENABLED=false
```

To enable the database health check in an environment that has PostgreSQL
available, set runtime environment variables outside source control:

```env
APP_DB_ENABLED=true
DB_URL=jdbc:postgresql://localhost:5432/effort
DB_USERNAME=effort_app
DB_PASSWORD=replace-at-runtime
```

Do not commit DB credentials to Git. Runtime secrets should come from Tomcat,
Jenkins credentials, or the target platform secret manager.

The internal DB health endpoint is:

```text
GET /api/internal/db-health
```

When DB access is disabled, it returns:

```json
{
  "ok": true,
  "data": {
    "status": "DISABLED"
  },
  "meta": {
    "request_id": "..."
  }
}
```

When enabled, the endpoint runs `SELECT 1` through `JdbcTemplate` and returns
`UP` or `DOWN`. Error messages are sanitized so password-like values are not
exposed in the response.

## Dev Auth/Permission Skeleton

The scaffold exposes fixed auth response shapes for frontend/API adapter work:

```text
GET /api/me
GET /api/me/permissions
```

The default security mode is development-only:

```env
APP_SECURITY_MODE=dev
DEV_USER_ID=00000000-0000-0000-0000-000000000001
DEV_USER_EMAIL=dev@example.com
DEV_USER_DISPLAY_NAME=Dev User
DEV_DEPARTMENT_ID=
DEV_ROLE_CODES=viewer
DEV_PERMISSION_CODES=route.estimator.read,project.read.own,export.read
```

`DEV_ROLE_CODES` and `DEV_PERMISSION_CODES` are comma-separated strings.
Whitespace and duplicate values are removed while preserving order.

Roles do not automatically grant permissions in this scaffold. For example,
`system_admin` is just a role code unless `DEV_PERMISSION_CODES` explicitly
contains the desired permission codes.

Do not use `APP_SECURITY_MODE=dev` as production security. SSO/JWT integration,
DB-backed permission lookup, and full domain endpoint coverage are future
phases. The standard effort project input read endpoint is currently the first
project-scoped read endpoint wired through the project context/scope skeleton.

## Permission Interceptor Skeleton

The scaffold includes an annotation-based permission guard:

```java
@RequirePermission("project.write.all")
```

`@RequirePermission` can be placed on a controller class or method. Method-level
annotations override class-level annotations. Endpoints without the annotation
are allowed, so existing scaffold endpoints such as `/api/health`,
`/api/internal/db-health`, `/api/me`, and `/api/me/permissions` keep working.

`PermissionCheckMode.ALL` requires every listed permission. `ANY` requires at
least one listed permission.

The interceptor is registered for `/api/**`, delegates to `PermissionService`,
and checks only explicit `permission_codes`. Role names do not automatically
grant permissions; `system_admin` is not magical unless the required permission
code is present.

Permission failures return the common error wrapper:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다.",
    "details": {
      "required_permissions": ["project.write.all"]
    },
    "request_id": "..."
  }
}
```

Unauthenticated users return `UNAUTHORIZED`.

This phase does not add DB-backed permission lookup, SSO/JWT/OIDC/SAML,
audit DB inserts, or domain controllers.

## Project Scope Skeleton

The scaffold includes a pure project access decision service:

```java
projectScopeService.requireRead(context);
projectScopeService.requireWrite(context);
projectScopeService.requireArchive(context);
projectScopeService.requireRestore(context);
```

This service is separate from route-level `@RequirePermission` checks.
`@RequirePermission` answers whether the actor can call an endpoint category.
`ProjectScopeService` answers whether the actor can access a specific project
after the service layer has loaded that project's ownership/scope context.

`ProjectAccessContext` preserves `project_id` as a string so bigint-compatible
numeric ids are not converted to UUID. The context is supplied by callers and
currently contains:

- `projectId`
- `ownerUserId`
- `departmentId`
- `assignedUserIds`
- `status`
- `archivedAt`

Current skeleton policy:

- READ allows `project.read.all`.
- READ allows `project.read.department` when the actor and project department
  match.
- READ allows `project.read.own` when the actor owns the project.
- WRITE blocks archived projects before checking write grants.
- WRITE allows `project.write.all`.
- WRITE allows `project.write.own` when the actor owns the project.
- WRITE allows `project.write.assigned` when the actor is assigned to the
  project.
- ARCHIVE blocks archived projects and currently requires `project.write.all`.
- RESTORE currently requires `project.write.all`.

Roles do not automatically grant project scope. For example, `system_admin`
without explicit `project.*` permission codes is denied.

This phase does not add `ProjectRepository`, `app_project_members` queries,
department tree lookup, domain controller integration, or audit DB inserts.

## Project Context Lookup Skeleton

The scaffold includes a small DB lookup boundary used to prepare future
`ProjectScopeService` integration:

```java
projectContextService.loadProjectAccessContext(projectId);
```

The service validates `projectId` as a numeric string, preserves it as a string,
and does not convert it to UUID. It loads a `ProjectSummaryDto`, attaches
assigned user ids, and maps that data into `ProjectAccessContext`.

The JDBC repository is created only when `JdbcTemplate` exists, which means DB
access must be enabled through:

```env
APP_DB_ENABLED=true
```

When DB access is disabled, `ProjectContextService` throws
`ServiceUnavailableException`. When a project row is not found, it throws
`NotFoundException`.

Project summary lookup uses `estimation_projects` and reads optional
`owner_user_id` and `department_id` through `to_jsonb(p)->>'...'` so older
schemas that do not have those fields can still map them as `null`. Assigned
users are read from `app_project_members`.

This skeleton does not expose a project CRUD endpoint and does not write audit
rows. It is now used by the standard effort project input read endpoint before
calling `ProjectScopeService.requireRead(context)`.

## Standard Effort Active Meta Read

The scaffold includes the first standard effort read endpoint:

```text
GET /api/standard-effort/meta
```

Required permission:

```text
route.estimator.read
```

When `APP_DB_ENABLED=true` and `JdbcTemplate` is available, the endpoint reads
active calculation metadata from these tables:

- `public.estimation_solution`
- `public.estimation_solution_variant`
- `public.estimation_standard_base_effort_meta`
- `public.estimation_standard_item_meta`
- `public.estimation_item_solution_coefficient_meta`

Only `active = true` rows are returned. The endpoint does not query project
selection tables, does not calculate standard effort, and does not write audit
rows. Standard effort values remain M/M and use `effort_mm`; coefficients remain
unitless.

When DB access is disabled, the endpoint returns the common error wrapper with
HTTP `503` and `SERVICE_UNAVAILABLE` instead of returning fake data.

## Standard Effort Project Input Read

The scaffold also includes the project-bound read endpoint used by the frontend
standard effort API adapter:

```text
GET /api/projects/{projectId}/standard-effort
```

Required checks:

```text
route.estimator.read
ProjectScopeService.requireRead(context)
```

The service first loads project context with
`projectContextService.loadProjectAccessContext(projectId)`, then calls
`projectScopeService.requireRead(context)`, then composes the active standard
effort metadata with project selections.

Response `data` contains the full input shape:

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

Project selections are read from:

- `public.estimation_project_solution_selection`
- `public.estimation_project_item_solution_selection`

The queries keep `project_id` as a bigint-compatible string by using
`CAST(? AS bigint)` and `::text` projections. The endpoint does not calculate
standard effort and does not write audit rows.

## Standard Effort Solution Selection Write

The scaffold includes the first Standard Effort write endpoint:

```text
PUT /api/projects/{projectId}/standard-effort/solutions
```

Required checks:

```text
standard_effort.selection.write
ProjectScopeService.requireWrite(context)
```

Request body:

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

The service validates `project_id` as a numeric string, rejects body/path
mismatches, rejects duplicate `solution_variant_id` rows, rejects
`actual_effort_md`, and requires each `solution_variant_id` to reference an
active solution variant. `enabled` defaults to `true` and blank
`actual_effort_mm` defaults to `0`.

The JDBC repository writes `public.estimation_project_solution_selection` with
`INSERT ... ON CONFLICT (project_id, solution_variant_id) DO UPDATE`.
`project_id` is passed as a bigint-compatible string and cast in SQL.
`actual_effort_mm` is used exclusively; `actual_effort_md` is not referenced.

The write flow calls `ProjectContextService.loadProjectAccessContext(projectId)`,
`ProjectScopeService.requireWrite(context)`, reads before state, upserts rows,
and then calls strict `AuditService.recordSuccess(...)` with
`standard_effort.solution.toggle`. If a transaction manager is available, the
write and success audit run through `TransactionTemplate`; audit failure
propagates so the transaction can roll back.

This phase does not implement server-side recalculation or frontend changes.

## Standard Effort Item Selection Write

The scaffold now includes the item selection write endpoint:

```text
PUT /api/projects/{projectId}/standard-effort/items
```

Required checks:

```text
standard_effort.selection.write
ProjectScopeService.requireWrite(context)
```

Request body:

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

The service validates `project_id` as a numeric string, rejects body/path
mismatches, rejects duplicate `(solution_variant_id, item_id)` rows, and rejects
standard effort value fields such as `effort_mm`, `actual_effort_mm`,
`actual_effort_md`, `standard_effort_mm`, and `gap_mm`. `checked` accepts
boolean-compatible values: `true`, `1`, `"1"`, `"Y"`, and `"true"` become
`true`; `false`, `0`, `"0"`, `"N"`, `"false"`, `null`, and blank strings become
`false`. Unknown checked strings return `VALIDATION_ERROR`.

The endpoint validates active solution variant, active item, and active
coefficient logical references before writing. The JDBC repository writes
`public.estimation_project_item_solution_selection` with
`INSERT ... ON CONFLICT (project_id, solution_variant_id, item_id) DO UPDATE`.
`project_id` is passed as a bigint-compatible string and cast in SQL. Item
selection writes do not use M/M effort fields and do not perform calculation.

The write flow calls `ProjectContextService.loadProjectAccessContext(projectId)`,
`ProjectScopeService.requireWrite(context)`, reads before state, upserts rows,
and then calls strict `AuditService.recordSuccess(...)` with
`standard_effort.item.check`. If a transaction manager is available, the write
and success audit run through `TransactionTemplate`; audit failure propagates so
the transaction can roll back.

## Standard Effort Actual Effort Write

The scaffold now includes the actual effort write endpoint:

```text
PUT /api/projects/{projectId}/standard-effort/actual-effort
```

Required checks:

```text
standard_effort.actual_effort.write
ProjectScopeService.requireWrite(context)
```

Request body:

```json
{
  "project_id": "42",
  "solution_variant_id": "uuid-or-string",
  "actual_effort_mm": 4.5
}
```

The service validates `project_id` as a numeric string, rejects body/path
mismatches, requires `solution_variant_id`, and requires the variant to
reference an active solution variant. `actual_effort_mm` null or blank values
normalize to `0`; negative and non-numeric values are rejected. The request
rejects `enabled`, `effort_mm`, `actual_effort_md`, `standard_effort_mm`, and
`gap_mm` so this endpoint only changes `actual_effort_mm`.

The JDBC repository writes `public.estimation_project_solution_selection` with
`INSERT ... ON CONFLICT (project_id, solution_variant_id) DO UPDATE`. Inserts
default `enabled=true`; updates preserve the existing `enabled` value and only
change `actual_effort_mm` plus `updated_at`. `project_id` is passed as a
bigint-compatible string and cast in SQL. M/D to M/M conversion is never
performed.

The write flow calls `ProjectContextService.loadProjectAccessContext(projectId)`,
`ProjectScopeService.requireWrite(context)`, reads before state, upserts the
row, and then calls strict `AuditService.recordSuccess(...)` with
`standard_effort.actual_effort.update`. If a transaction manager is available,
the write and success audit run through `TransactionTemplate`; audit failure
propagates so the transaction can roll back.

## Authoritative Audit Skeleton

The scaffold includes backend audit infrastructure for future write endpoints:

- `AuditEventType`
- `AuditTargetType`
- `AuditEventResult`
- `AuditCommand`
- `AuditRecord`
- `AuditWriteResult`
- `AuditJson`
- `AuditRepository`
- `JdbcAuditRepository`
- `AuditService`
- `AuditUnavailableException`

`JdbcAuditRepository` is created only when `APP_DB_ENABLED=true` and
`JdbcTemplate` is available. It inserts into `public.app_audit_logs` using the
existing migration columns:

- `event_type`
- `event_result`
- `actor_user_id`
- `actor_email`
- `target_type`
- `target_id`
- `project_id`
- `before_json`
- `after_json`
- `metadata_json`
- `ip_address`
- `user_agent`
- `request_id`

JSON payloads are serialized through `AuditJson`; password, token, secret,
authorization, and key-like fields are redacted before storage. JSON columns are
sent with `CAST(? AS jsonb)`. `project_id` remains a bigint-compatible numeric
string and is written with `CAST(? AS bigint)`. No UUID conversion or M/M unit
conversion is performed.

`AuditService.record(...)`, `recordSuccess(...)`, and `recordFailure(...)` are
strict: if the repository is unavailable they throw `AuditUnavailableException`.
`recordBestEffort(...)` catches failures and returns `AuditWriteResult` with
`ok=false`.

`AuditService` is now connected to the Standard Effort solution and item
selection write endpoints. Actual-effort writes, project writes, meta writes,
export audits, and audit query APIs are future phases.

## External Tomcat Note

The artifact is intended for deployment to external Tomcat 10.1+ with Jakarta
Servlet support. A candidate Tomcat context path is:

```text
/effort-api
```

The controller base path is:

```text
/api
```

Health endpoint candidates:

```text
http://localhost:8080/effort-api/api/health
http://localhost:8080/api/health
```

The second URL assumes Apache or another reverse proxy maps `/api` to the WAR
context.

## Frontend API Env Candidate

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=http://localhost:8080/effort-api/api
```

or through reverse proxy:

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=http://localhost:8080/api
```

Standard effort recalculation, audit read endpoints, DB-backed permission, and
export endpoints are not implemented in this scaffold phase.
