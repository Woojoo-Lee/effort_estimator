# Tomcat Backend Implementation Plan

## 1. Purpose

This document defines the implementation plan for moving the React/Vite
frontend to an operating model backed by Tomcat API and PostgreSQL.

It complements `docs/tomcat-api-contract.md`, which describes endpoint
contracts. This plan describes backend module structure, implementation order,
permission enforcement, authoritative audit, transaction boundaries, deployment
strategy, and test strategy.

This phase is documentation only. It does not create Java, Spring, Tomcat,
Jenkins, migration, seed, or frontend source files.

Final operating principles:

- React calls Tomcat API.
- Tomcat API owns permission enforcement and authoritative audit.
- PostgreSQL is accessed by backend service accounts, not by the browser.
- Frontend guards and read-only states are UX aids only.
- Database references remain logical references. Physical foreign keys are not
  required by this design.
- Standard effort values remain M/M and use `*_mm` fields.

## 2. Technology Assumptions

Target operating environment:

- WEB/WAS: Apache + Tomcat
- API runtime: Java-based web application
- Database: PostgreSQL, either internal PostgreSQL or AWS PostgreSQL family
- Source control: internal GitLab
- Deployment automation: Jenkins

Java web framework options:

| Option | Strengths | Tradeoffs | Recommendation |
|---|---|---|---|
| Spring Boot WAR on external Tomcat | Familiar layered API structure, strong validation/security/test support, can still deploy to Tomcat as WAR | Requires Spring Boot conventions and dependency governance | Recommended if internal standards allow it |
| Spring MVC WAR | Traditional Tomcat fit, explicit servlet container model | More boilerplate than Boot | Good alternative when Boot is not accepted |
| Servlet/JAX-RS | Lightweight and explicit | More custom infrastructure for security, validation, response wrappers, tests | Use only if internal standards require it |

Database access options:

| Option | Strengths | Tradeoffs | Recommendation |
|---|---|---|---|
| MyBatis | Explicit SQL, clear fit for logical reference validation and existing schema | Mapper maintenance | Recommended for SQL clarity |
| JdbcTemplate | Minimal abstraction, explicit transactions, easy to reason about SQL | More manual mapping | Recommended alternative |
| JPA | Strong domain object support | Can hide SQL and relationship behavior; less aligned with no-physical-FK policy | Avoid as the first choice unless team standard requires it |

Initial recommendation:

- Spring Boot or Spring MVC deployed as WAR to Tomcat.
- MyBatis or JdbcTemplate for explicit PostgreSQL SQL.
- Snake_case JSON serialization configured globally.

## 3. Backend Package Structure

Suggested base package:

```text
com.company.effort
  config
  web
    controller
    filter
    exception
    interceptor
  security
    auth
    permission
    scope
  audit
  project
    controller
    service
    repository
    dto
  standardeffort
    controller
    service
    repository
    dto
  standardeffortmeta
    controller
    service
    repository
    dto
  codebook
    controller
    service
    repository
    dto
  legacy
    controller
    service
    repository
    dto
  export
    controller
    service
    dto
  common
    response
    request
    validation
    db
```

Layer responsibilities:

- Controller: HTTP method/path binding, request DTO validation trigger,
  response DTO assembly, no business authorization decisions beyond annotations
  or route metadata.
- Service: permission coordination, project scope checks, logical reference
  validation, transaction orchestration, audit payload creation.
- Repository: SQL execution and row mapping. Repositories should not decide
  user permissions.
- Security middleware/interceptors: authenticated actor resolution and
  endpoint-level permission checks.
- Audit service: authoritative success/failure event recording for write and
  export endpoints.

## 4. Common Web Layer

Required components:

- `RequestIdFilter`
- `ApiResponse`
- `ErrorResponseHandler`
- `AuthenticationFilter` or `SsoJwtFilter`
- `PermissionInterceptor`
- `RequestLoggingFilter`
- CORS/CSRF policy configuration
- Snake_case JSON serialization configuration

Request id rules:

- Accept `X-Request-Id` from the frontend when supplied.
- Generate a request id when missing.
- Store request id in request context/MDC for logs.
- Return request id in all success and error response wrappers.
- Persist request id in audit rows.

Success response:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "01HYREQABC"
  }
}
```

Failure response:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access is denied.",
    "details": {},
    "request_id": "01HYREQABC"
  }
}
```

Error mapping:

| HTTP status | Error code |
|---:|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `BUSINESS_RULE_VIOLATION` |
| 500 | `INTERNAL_ERROR` |

## 5. Auth and Permission Plan

Initial endpoints:

- `GET /api/me`
- `GET /api/me/permissions`

Initial scaffold status:

- `app.security.mode=dev` is the only implemented mode.
- Dev mode returns configured `DEV_*` user, role, and permission values.
- Dev role codes do not automatically grant permissions.
- SSO/JWT/OIDC/SAML integration is not implemented yet.
- DB-backed `app_users`, `app_roles`, and `app_permissions` lookup is not
  implemented yet.
- `PermissionInterceptor` skeleton is implemented for annotated endpoints.
- `ProjectScopeService` skeleton is implemented as a pure decision service.
- `ProjectContextService` skeleton is implemented for DB-backed project context
  lookup.
- Standard Effort active meta and project input read endpoints are implemented,
  annotated, and scope-guarded where project context is required.
- Standard Effort solution selection write is implemented with
  `standard_effort.selection.write`, project write scope, active variant logical
  validation, transaction wrapper, and strict backend audit.
- Standard Effort item selection write is implemented with
  `standard_effort.selection.write`, project write scope, checked normalization,
  active variant/item/coefficient logical validation, transaction wrapper, and
  strict backend audit.
- Standard Effort actual effort write, export, and project CRUD controllers are
  not implemented yet.

Referenced tables:

- `app_users`
- `app_roles`
- `app_permissions`
- `app_role_permissions`
- `app_user_roles`
- `app_departments`
- `app_project_members`

Core backend types:

- `CurrentUser`
- `PermissionSnapshot`
- `PermissionService`
- `ProjectScopeService`

Permission enforcement policy:

- Frontend route guards are UX-only.
- Tomcat middleware checks endpoint-level permissions before controller logic.
- Services perform project scope checks and logical reference checks.
- `system_admin` should not be treated as magical by role name only. Prefer
  permission-set based authorization so role names remain configurable.
- Project scope must support:
  - own
  - assigned
  - department
  - all

Implementation options:

- Annotation based: `@RequirePermission("permission.code")`
- Route registry based: centralized endpoint-to-permission mapping

Recommended approach:

- Use annotation or route metadata for endpoint-level permission.
- Use `ProjectScopeService` inside services for project read/write scope because
  it depends on request path data and project ownership/membership.

Current `PermissionInterceptor` skeleton:

- Registers for `/api/**`.
- Allows handlers without `@RequirePermission`.
- Uses method-level `@RequirePermission` before class-level fallback.
- Supports `PermissionCheckMode.ALL` and `PermissionCheckMode.ANY`.
- Checks explicit `permission_codes` through `PermissionService`.
- Does not derive permissions from role names such as `system_admin`.
- Does not perform project scope checks.
- Does not write audit rows.
- Returns common `UNAUTHORIZED` and `FORBIDDEN` wrappers through the global
  exception handler.

Current `ProjectScopeService` skeleton:

- Uses `CurrentUserProvider` and `PermissionService`.
- Checks explicit `permission_codes` only; role names do not auto-grant scope.
- Preserves bigint-compatible `project_id` as a string and does not convert it
  to UUID.
- `READ` allows `project.read.all`, matching `project.read.department`, or
  matching `project.read.own`.
- `WRITE` blocks archived projects first, then allows `project.write.all`,
  matching `project.write.own`, or matching `project.write.assigned`.
- `ARCHIVE` blocks archived projects first and currently requires
  `project.write.all`.
- `RESTORE` currently requires `project.write.all`.
- Throws `AuthenticationRequiredException` for unauthenticated require calls.
- Throws `ProjectAccessDeniedException` for denied authenticated require calls.
- Does not load project rows directly, evaluate department trees, write audit
  rows, or integrate with domain controllers yet.

Current `ProjectContextService` skeleton:

- Uses `ProjectContextRepository` with a `JdbcTemplate` implementation.
- Provides the lookup/mapping boundary for project-bound services.
- Validates `projectId` as a numeric string and preserves it as a string.
- Queries `estimation_projects` using `CAST(? AS bigint)`.
- Reads optional `owner_user_id` and `department_id` defensively.
- Reads assigned user ids from `app_project_members`.
- Builds `ProjectAccessContext`; project-bound services call
  `ProjectScopeService` with that context.
- Throws `ServiceUnavailableException` when the repository is unavailable
  because DB access is disabled.
- Throws `NotFoundException` when the project is missing.
- Does not expose a Project CRUD endpoint.

Current Standard Effort active meta read skeleton:

- Implements `GET /api/standard-effort/meta`.
- Applies `@RequirePermission(PermissionCodes.ROUTE_ESTIMATOR_READ)`.
- Uses `JdbcTemplate` only when DB access is enabled and a `JdbcTemplate` bean
  exists.
- Returns active calculation metadata only.
- Uses independent table queries and service-layer response composition.
- Keeps `effort_mm` as M/M and `coefficient` as a unitless value.
- Does not implement write APIs, server-side calculation, or audit DB insert.
- Returns `SERVICE_UNAVAILABLE` when the repository is unavailable because DB
  access is disabled.

Current Standard Effort project input read skeleton:

- Implements `GET /api/projects/{projectId}/standard-effort`.
- Applies `@RequirePermission(PermissionCodes.ROUTE_ESTIMATOR_READ)`.
- Calls `ProjectContextService.loadProjectAccessContext(projectId)`.
- Calls `ProjectScopeService.requireRead(context)`.
- Reuses active standard effort meta queries.
- Reads project selections from
  `estimation_project_solution_selection` and
  `estimation_project_item_solution_selection`.
- Keeps `project_id` as a bigint-compatible string using `CAST(? AS bigint)`
  and `::text` projections.
- Returns the full frontend input shape with active meta arrays and project
  selection arrays.
- Does not implement write APIs, server-side calculation, or audit DB insert.

## 6. Authoritative Audit Plan

Audit table:

- `app_audit_logs`

Principles:

- Backend audit is authoritative in API mode.
- Frontend audit should be disabled in production API mode.
- Write endpoints should be designed so both success and failure can be audited
  when useful.
- Export endpoints should write `export.download` audit on successful export.

Suggested `AuditService` methods:

- `record`
- `recordSuccess`
- `recordFailure`
- `recordBestEffort`

Current scaffold status:

- `AuditService`, `AuditRepository`, `JdbcAuditRepository`, and audit models are
  implemented as a skeleton.
- `JdbcAuditRepository` inserts into `public.app_audit_logs` only when
  `app.db.enabled=true` and `JdbcTemplate` exists.
- `AuditJson` serializes before/after/metadata payloads and redacts sensitive
  keys before JSONB storage.
- Standard Effort solution and item selection writes call strict
  `AuditService.recordSuccess(...)`.
- Other domain services do not call `AuditService` yet.
- Standard Effort solution and item selection writes use a transaction wrapper
  when a transaction manager is available; broader transaction integration is
  still deferred to later write endpoint phases.

Required audit fields:

- `actor_user_id`
- `actor_email`
- `event_type`
- `event_result`
- `target_type`
- `target_id`
- `project_id`
- `before_json`
- `after_json`
- `metadata_json`
- `request_id`
- `ip`
- `user_agent`

Required event types:

- `project.create`
- `project.update`
- `project.archive`
- `project.restore`
- `project.version.create`
- `standard_effort.solution.toggle`
- `standard_effort.item.check`
- `standard_effort.actual_effort.update`
- `standard_effort_meta.base_effort.update`
- `standard_effort_meta.coefficient.update`
- `standard_effort_meta.active.update`
- `export.download`
- `role.assign`
- `role.revoke`

Audit transaction policy options:

| Option | Strengths | Tradeoffs |
|---|---|---|
| Same transaction for business write and success audit | Strong consistency; no committed write without audit | Audit insert failure can block business write |
| After-commit durable audit | Business write is protected; audit can retry | Requires reliable outbox or retry design |
| Best-effort failure audit | Captures denied/failed attempts without blocking | Can miss rows during infrastructure failures |

Recommended initial policy:

- Business success audit in the same transaction or through a reliable
  after-commit/outbox strategy.
- Failure audit as best effort with clear logging.
- Do not silently ignore success audit failures in production without an
  operational alert.

## 7. Domain Implementation Plans

### 7.1 Project API

Endpoints:

- `GET /api/projects`
- `GET /api/projects?include_archived=true`
- `GET /api/projects?status=archived`
- `GET /api/projects/{projectId}`
- `POST /api/projects`
- `PUT /api/projects/{projectId}`
- `PUT /api/projects/{projectId}/archive`
- `PUT /api/projects/{projectId}/restore`

Controllers/services/repositories:

- `ProjectController`
- `ProjectService`
- `ProjectRepository`
- `ProjectVersionRepository`
- `ProjectScopeService`

Rules:

- `project_id` remains bigint/int8 compatible.
- JSON may use number or numeric string.
- Do not convert project ids to UUID.
- Default project list excludes archived projects.
- Archived project writes are blocked except restore/admin workflows.
- Archive should set `status='archived'`, `archived_at=now()`, and
  `archived_by=actor`.
- Restore should set `status='active'` and clear archive fields.
- Hard delete should remain system-admin/admin-only candidate.
- Write authoritative `project.create`, `project.update`,
  `project.archive`, and `project.restore` audit.

### 7.2 Project Version API

Endpoints:

- `GET /api/projects/{projectId}/versions`
- `GET /api/projects/{projectId}/versions/latest`
- `POST /api/projects/{projectId}/versions`

Rules:

- Version payload is the legacy project payload.
- Do not include standard effort selections, item selections, or
  `actual_effort_mm` in version payloads.
- Validate project read/write scope.
- Write `project.version.create` audit for version creation.

### 7.3 Standard Effort Calculation API

Endpoints:

- `GET /api/standard-effort/meta`
- `GET /api/projects/{projectId}/standard-effort`
- `PUT /api/projects/{projectId}/standard-effort/solutions`
- `PUT /api/projects/{projectId}/standard-effort/items`
- `PUT /api/projects/{projectId}/standard-effort/actual-effort`
- `POST /api/projects/{projectId}/standard-effort/recalculate` candidate

Controllers/services/repositories:

- `StandardEffortController`
- `StandardEffortService`
- `StandardEffortRepository`
- `StandardEffortCalculationService` candidate

Rules:

- Calculation meta endpoint returns active calculation metadata only.
- Project standard effort input may return full input shape to minimize
  frontend round trips.
- Solution selection write performs upsert and stores `enabled=false` rather
  than deleting rows.
- Item selection write stores `checked=false` rather than deleting rows.
- `checked` responses must be boolean.
- `actual_effort_mm` null, undefined, or empty string normalizes to `0`.
- All standard effort effort values remain M/M.
- Do not use legacy `effort_md` or `actual_effort_md` names in new standard
  effort API payloads.
- Validate project, solution variant, and item logical references in service.
- Write authoritative audit events for solution toggle, item check, and actual
  effort updates.

### 7.4 Standard Effort Meta Admin API

Endpoints:

- `GET /api/standard-effort/admin/meta`
- `PUT /api/standard-effort/admin/base-effort/{solutionVariantId}`
- `PUT /api/standard-effort/admin/coefficients/{itemId}`
- `PUT /api/standard-effort/admin/solution-variants/{solutionVariantId}/active`
- `PUT /api/standard-effort/admin/items/{itemId}/active`
- `GET /api/standard-effort/admin/validation-summary` candidate

Controllers/services/repositories:

- `StandardEffortMetaController`
- `StandardEffortMetaService`
- `StandardEffortMetaRepository`
- `StandardEffortMetaValidationService` candidate

Rules:

- Admin meta read includes active and inactive rows.
- Active=false rows remain visible in admin.
- `effort_mm` must be numeric and non-negative.
- `coefficient` must be numeric, non-negative, and unitless.
- Active endpoints must require boolean `active`; do not coerce `"true"` or
  `"false"` strings.
- Metadata writes should produce backend authoritative audit.

### 7.5 Codebook API

Endpoints:

- `GET /api/codebooks`
- `GET /api/codebooks/rows`
- `POST /api/codebooks`
- `PUT /api/codebooks/{id}`
- `PUT /api/codebooks/{id}/active`

Controllers/services/repositories:

- `CodebookController`
- `CodebookService`
- `CodebookRepository`

Rules:

- Define a dedicated write permission in a future schema/seed phase or restrict
  writes to system/meta admin through backend policy.
- Clarify `active` versus `is_active` response policy. Current frontend expects
  `is_active`.
- Do not include standard effort fields in codebook request payloads.
- Candidate audit events:
  - `codebook.create`
  - `codebook.update`
  - `codebook.active.update`

### 7.6 Legacy Estimator Meta API

Endpoints:

- `GET /api/legacy-estimator/item-meta`
- `GET /api/legacy-estimator/item-meta/rows`
- `GET /api/legacy-estimator/base-effort-meta`
- `GET /api/legacy-estimator/item-field-meta`
- `GET /api/legacy-estimator/env-var-meta`
- `GET /api/legacy-estimator/calculation-meta`
- `GET /api/legacy-estimator/policy`

Controllers/services/repositories:

- `LegacyEstimatorMetaController`
- `LegacyEstimatorMetaService`
- `LegacyEstimatorMetaRepository`

Rules:

- Initial implementation is read-only.
- Preserve legacy md/md-like fields such as `default_base_md`, `base_md`, and
  `effort_md`.
- Do not mix standard effort `*_mm` fields into legacy metadata responses.
- No M/D to M/M conversion.

### 7.7 Export API

First endpoint:

- `GET /api/projects/{projectId}/standard-effort/export-data`

Later candidates:

- `GET /api/projects/{projectId}/standard-effort/export`
- `GET /api/projects/{projectId}/legacy/export`

Controllers/services:

- `ExportController`
- `ExportService`
- `StandardEffortExportService`

Rules:

- Enforce `export.read`, `export.standard_effort`, and project read scope.
- Return JSON export-data for the initial frontend workbook strategy.
- Use `base_total_mm`, `standard_effort_mm`, `actual_effort_mm`, and `gap_mm`.
- Keep `coefficient` unitless.
- Do not convert standard effort M/M fields to M/D.
- Write authoritative `export.download` audit on successful export-data
  retrieval or file download, depending on final audit semantics.

## 8. DB Access and Transaction Boundaries

General rules:

- Service layer validates logical references.
- Physical foreign keys are not required.
- Repositories execute SQL only.
- Write endpoints use transactions.
- Multi-row standard effort and meta admin writes should be atomic.
- Project archive/restore and audit should be transactionally consistent.

Initial DB connectivity scaffold:

- `app.db.enabled` is disabled by default.
- Runtime DB access is enabled only with `APP_DB_ENABLED=true`.
- Runtime secrets are supplied through `DB_URL`, `DB_USERNAME`, and
  `DB_PASSWORD`; they are not committed to Git.
- `GET /api/internal/db-health` is an internal connectivity check only.
- The DB health endpoint returns `DISABLED`, `UP`, or `DOWN` through the common
  response wrapper and includes `meta.request_id`.
- Password-like values in DB health errors must be redacted.
- This scaffold does not add domain SQL repositories, auth, permission, audit
  insert behavior, migrations, or business endpoints.

Transaction candidates:

- Project save plus `project.create` or `project.update` audit.
- Project archive/restore plus audit.
- Project version save plus audit.
- Standard effort solution/item/actual writes plus audit.
- Standard effort meta base/coefficient/active writes plus audit.
- Codebook writes plus audit.

Recommended policy:

- Validate permission and project scope before transaction when possible.
- Re-read target rows inside transaction when `before_json` audit is needed.
- Write business rows and success audit in one transaction or through a durable
  after-commit strategy.
- Failure audit may be best-effort and should not mask the original error.

## 9. Endpoint Implementation Priority

### Phase 9-B

- Choose backend project skeleton and module layout.
- Define API response wrapper, error handler, request id filter, DB config, and
  JSON snake_case policy.
- No production endpoint behavior yet.

### Phase 9-C

- Implement auth/permission skeleton endpoints:
  - `GET /api/me`
  - `GET /api/me/permissions`
- Implement `CurrentUser`, `PermissionSnapshot`, permission constants, and a
  development-only configured current user provider.
- Do not implement SSO/JWT, DB user/role lookup, permission middleware, or
  project scope enforcement in this scaffold phase.

### Phase 9-G Permission Interceptor Skeleton

- Implement `@RequirePermission`, `PermissionCheckMode`, `PermissionService`,
  `PermissionInterceptor`, and common permission exceptions.
- Register the interceptor for `/api/**`.
- Preserve existing unannotated scaffold endpoints.
- Return common `UNAUTHORIZED` and `FORBIDDEN` error wrappers.
- Verify with test-only controllers; do not add domain endpoints.
- Do not implement SSO/JWT, DB permission lookup, project DB lookup, or audit DB
  inserts in this skeleton phase.

### Phase 9-H Project Scope Skeleton

- Implement `ProjectAccessAction`, `ProjectAccessContext`,
  `ProjectAccessDecision`, `ProjectAccessDeniedException`, and
  `ProjectScopeService`.
- Keep the service pure and test-driven.
- Preserve `project_id` as a string for bigint/int8-compatible ids.
- Block archived project writes.
- Require `project.write.all` for archive and restore decisions in the initial
  skeleton.
- Return common `FORBIDDEN` wrappers for `ProjectAccessDeniedException`.
- Do not implement Project API, DB-backed project lookup,
  `app_project_members` lookup, department tree lookup, domain controller
  integration, or audit DB inserts in this skeleton phase.

### Phase 9-I-1-alt Standard Effort Active Meta Read

- Implement `GET /api/standard-effort/meta` only.
- Add Standard Effort DTOs, `StandardEffortRepository`,
  `StandardEffortJdbcRepository`, `StandardEffortService`, and
  `StandardEffortController`.
- Apply `route.estimator.read` permission.
- Query only active calculation metadata.
- Keep project input, project selection queries, write APIs, server-side
  calculation, audit DB insert, and project-scope endpoint wiring as follow-up
  work.

### Phase 9-I-2 Project Context Lookup Skeleton

- Implement `ProjectSummaryDto`, `ProjectContextRepository`,
  `JdbcProjectContextRepository`, and `ProjectContextService`.
- Keep `project_id` as a bigint-compatible string.
- Load optional owner/department fields and assigned users for future
  `ProjectScopeService` integration.
- Do not implement Project API, Standard Effort project input, project
  selection queries, write APIs, audit DB insert, or endpoint wiring in this
  phase.

### Phase 9-I-3 Standard Effort Project Input Read

- Implement `GET /api/projects/{projectId}/standard-effort`.
- Add project selection DTOs and full input response DTO.
- Add selection read methods to `StandardEffortRepository` and
  `StandardEffortJdbcRepository`.
- Query project selections with `project_id = CAST(? AS bigint)` and return
  `project_id::text`.
- Call `ProjectContextService.loadProjectAccessContext(projectId)`.
- Call `ProjectScopeService.requireRead(context)`.
- Reuse active standard effort metadata queries.
- Keep write APIs, server-side calculation, audit DB insert, and Project CRUD
  endpoints as follow-up work.

### Phase 9-I-8 Standard Effort Actual Effort Write

- Implement `PUT /api/projects/{projectId}/standard-effort/actual-effort`.
- Apply `standard_effort.actual_effort.write` and project write scope through
  `ProjectScopeService.requireWrite(context)`.
- Validate numeric-string `project_id`, active `solution_variant_id`, and
  non-negative `actual_effort_mm`.
- Reject `enabled`, `effort_mm`, `actual_effort_md`, `standard_effort_mm`, and
  `gap_mm` in the request body.
- Upsert `public.estimation_project_solution_selection` with
  `ON CONFLICT (project_id, solution_variant_id)`, defaulting `enabled=true`
  only on insert and preserving `enabled` on update.
- Record strict backend audit with
  `standard_effort.actual_effort.update` inside the transaction boundary.
- Keep server-side recalculation, frontend source changes, export endpoints, and
  Project CRUD endpoints as follow-up work.

### Phase 9-D

- Implement standard effort calculation API:
  - active meta read
  - project standard effort input read
  - solution selection write
  - item selection write
  - actual effort write

### Phase 9-E

- Implement standard effort meta admin API:
  - admin meta read including inactive rows
  - base effort write
  - coefficient write
  - active toggles
  - optional validation summary

### Phase 9-F

- Implement project CRUD/archive/restore/version API.

### Phase 9-G

- Implement codebook and legacy estimator metadata API.

### Phase 9-H

- Implement standard effort export-data API.

### Phase 9-I

- Document or scaffold Jenkins/GitLab backend deployment pipeline.

Each phase should define controller tests, service permission tests, repository
SQL tests, and frontend contract smoke tests before implementation begins.

## 10. Backend Test Strategy

Unit tests:

- Permission service.
- Project scope service.
- DTO validation.
- Standard effort calculation parity.
- Audit payload builder.

Repository tests:

- SQL query shape.
- Row mapping.
- Logical reference lookup.
- PostgreSQL integration candidate.
- Testcontainers candidate if internal CI allows containers.

Controller tests:

- Response wrapper.
- Validation error wrapper.
- Permission denied wrapper.
- Request id propagation.
- Snake_case JSON serialization.

Integration tests:

- Standard effort selection save.
- Standard effort item save.
- Actual effort update.
- Meta base effort save.
- Meta coefficient save.
- Active toggle.
- Project archive/restore.
- Export-data response.

Smoke tests:

- Frontend with `VITE_DATA_BACKEND=api`.
- `VITE_API_BASE_URL` configured.
- Standard mode export downloads workbook.
- `app_audit_logs` receives backend authoritative audit.

## 11. Jenkins and GitLab Pipeline Plan

Frontend pipeline:

- Install dependencies with locked dependency strategy.
- Run `npm.cmd run test:run`.
- Run `npm.cmd run build`.
- Publish `dist` artifact.
- Deploy static artifact to WEB tier.

Backend pipeline:

- Run Maven or Gradle unit tests.
- Run integration tests where environment allows.
- Package WAR or JAR.
- Publish backend artifact with version metadata.
- Deploy to Tomcat.

Database pipeline:

- Migration dry run.
- Stage apply.
- Stage smoke tests.
- Production manual approval.
- Production apply.
- Post-deploy smoke tests.

Secrets:

- Store DB passwords in Jenkins credentials.
- Store SSO client secrets in Jenkins credentials or platform secret manager.
- Do not commit secrets to Git.
- Do not bake runtime secrets into frontend artifacts.

Rollback:

- Frontend artifact rollback.
- Backend WAR/JAR rollback.
- Prefer DB forward-fix for migrated schemas.
- During transition, `VITE_DATA_BACKEND=supabase` can be a frontend fallback
  only while Supabase direct access is still intentionally supported.

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Frontend/backend contract mismatch | Keep `docs/tomcat-api-contract.md` and adapter tests aligned with backend controller tests. |
| Missing permission checks | Require endpoint permission tests and project scope service tests for every write endpoint. |
| Missing or duplicate audit | Make backend audit authoritative; disable frontend audit in production API mode. |
| Logical validation gaps because physical FKs are absent | Centralize logical reference validation in services and test missing-reference cases. |
| `project_id` bigint/UUID confusion | Treat project ids as bigint/int8-compatible number or numeric string in API and SQL. |
| M/M unit confusion | Keep standard effort fields as `*_mm`; reject M/D conversion in standard effort APIs. |
| Archived project writes allowed accidentally | Add service guard and tests for archived project write blocking. |
| Export exposes sensitive data | Enforce export permission, project read scope, and audit. Define export payload fields explicitly. |
| Supabase/API dual-write transition lasts too long | Use repository backend flags only during transition and define a cutover checklist. |
| Jenkins build-time env confusion | Document build-time Vite env and runtime backend env separately. |
| Rollback path unclear | Keep artifact versioning and phase-specific rollback notes. |

## 13. Phase 9-A Scope Confirmation

This phase adds only this planning document.

It does not modify:

- `src/**`
- `db/migrations/**`
- `db/seeds/**`
- `scripts/**`
- `package.json`
- `package-lock.json`
- frontend repository adapters
- frontend UI, store, or hooks
- backend source code
- Jenkinsfile
