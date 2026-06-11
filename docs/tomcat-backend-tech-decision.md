# Tomcat Backend Technology Decision

## 1. Purpose

This document records the recommended backend technology choices before the
Tomcat API scaffold is created.

It is based on the target operating environment:

- React/Vite frontend
- Apache + Tomcat
- PostgreSQL
- internal GitLab
- Jenkins deployment

The goal is to choose a backend scaffold direction that matches the existing
frontend adapters and `docs/tomcat-api-contract.md` without creating backend
source code in this phase.

This phase is documentation only. It does not create Java, Spring, Tomcat,
Jenkins, migration, seed, or frontend source files.

## 2. Assumptions

- The frontend is deployed as a separate `dist` artifact.
- The backend is an API application deployed to Tomcat.
- PostgreSQL is accessed only by backend service accounts in the final
  operating model.
- Browser direct DB access is removed in production API mode.
- Tomcat API is authoritative for permission checks and audit logs.
- API JSON uses snake_case.
- `project_id` is PostgreSQL `bigint/int8`; JSON may use number or numeric
  string.
- Standard effort values remain M/M:
  - `effort_mm`
  - `base_total_mm`
  - `standard_effort_mm`
  - `actual_effort_mm`
  - `gap_mm`
- `coefficient` is unitless.
- Standard effort APIs do not perform M/D to M/M or M/M to M/D conversion.
- Physical foreign keys are not required; logical reference validation happens
  in the service layer.

## 3. Decision 1: Web Framework

Options:

- Spring Boot WAR
- Spring MVC WAR
- Servlet/JAX-RS

Comparison criteria:

- Fit with external Tomcat deployment
- Development speed
- Configuration complexity
- Jenkins packaging
- Health check and observability support
- Security/filter/interceptor support
- Response and error wrapper support
- Long-term maintenance

| Option | Strengths | Weaknesses | Fit |
|---|---|---|---|
| Spring Boot WAR | Fast scaffold, strong validation/testing/security conventions, can package as WAR for external Tomcat, easy health endpoints | Requires internal acceptance of Boot conventions; embedded Tomcat defaults must be adjusted for external WAR | Best default when no stricter internal standard exists |
| Spring MVC WAR | Traditional Tomcat model, explicit servlet deployment, familiar in many enterprise environments | More boilerplate than Boot, more manual common configuration | Strong fit if the company already standardizes on Spring MVC WAR |
| Servlet/JAX-RS | Lightweight, explicit, minimal framework assumptions | More custom work for validation, security, error handling, response wrappers, tests, and observability | Lowest priority unless mandated |

Recommendation:

- Prefer Spring Boot based WAR packaging if internal standards allow it.
- Use external Tomcat deployment rather than executable JAR for the first API
  production target.
- If the company already has a Spring MVC WAR standard, follow that standard.
- Avoid standalone Servlet/JAX-RS unless internal governance requires it.

Rationale:

- The API needs consistent response wrappers, request id propagation,
  permission middleware, validation, and controller tests.
- Spring Boot or Spring MVC provides these cross-cutting pieces with less
  custom infrastructure.
- WAR packaging aligns with the Apache + Tomcat operating assumption.

## 4. Decision 2: Build Tool

Options:

- Maven
- Gradle

Comparison criteria:

- Internal standard availability
- Jenkins integration
- Dependency governance
- Multi-module extensibility
- New developer familiarity
- Reproducible builds
- WAR packaging support

| Option | Strengths | Weaknesses | Fit |
|---|---|---|---|
| Maven | Conventional for enterprise WAR builds, stable Jenkins integration, strong reproducibility, clear lifecycle | Verbose XML, less flexible custom build logic | Recommended default when no internal standard exists |
| Gradle | Flexible, concise, strong for complex/multi-module builds | Requires more build script discipline; internal Jenkins templates may vary | Good candidate when team already standardizes on Gradle |

Recommendation:

- Follow the internal standard if one exists.
- If no standard exists, start with Maven.
- Revisit Gradle only if multi-module customization or existing team practice
  makes it clearly beneficial.

Rationale:

- The initial backend needs predictable WAR packaging more than custom build
  flexibility.
- Maven is easy to wire into Jenkins stages: test, package, publish artifact,
  deploy WAR.

## 5. Decision 3: Database Access

Options:

- MyBatis
- JdbcTemplate
- JPA/Hibernate

Comparison criteria:

- SQL explicitness
- PostgreSQL complex query support
- Fit with no physical FK and logical reference validation
- Snake_case DTO mapping
- Transaction control
- Performance visibility
- Production debugging
- Fit with the existing schema

| Option | Strengths | Weaknesses | Fit |
|---|---|---|---|
| MyBatis | Explicit SQL, strong mapper control, good for existing schemas and logical references | Mapper XML/interface maintenance | Recommended when team has MyBatis experience |
| JdbcTemplate | Minimal abstraction, explicit SQL, straightforward transaction behavior | More manual row mapping and SQL organization | Recommended for small/medium initial API if simplicity is preferred |
| JPA/Hibernate | Rich entity model and repository abstractions | Relationship mapping can conflict with no-physical-FK policy; SQL can become less visible | Not recommended as the first choice |

Recommendation:

- Prefer MyBatis or JdbcTemplate.
- Choose MyBatis if the team has experience or expects many reusable SQL
  mappers.
- Choose JdbcTemplate if the team wants the smallest abstraction and very
  explicit SQL.
- Avoid JPA/Hibernate for the first implementation unless internal standards
  require it.

Rationale:

- Current data design uses logical references rather than physical FKs.
- The backend must validate relationships in services and issue explicit SQL.
- Existing Supabase repository behavior can be translated more directly into
  SQL with MyBatis or JdbcTemplate.

## 6. Decision 4: Packaging and Deployment

Options:

- WAR deployed to external Tomcat
- Executable JAR with embedded Tomcat
- Existing Tomcat `webapps` deployment

Operating assumption:

- Apache + Tomcat is the expected production WEB/WAS platform.

Recommendation:

- Produce a WAR artifact for the initial backend.
- Deploy the WAR to the existing Tomcat deployment path or deployment directory.
- Use Apache/reverse proxy routing for the public API path.

Context path candidates:

- `/api`
- `/effort-api`

Frontend `VITE_API_BASE_URL` should point to the reverse-proxy-visible API base
URL. Examples:

```env
VITE_API_BASE_URL=/api
```

or:

```env
VITE_API_BASE_URL=https://effort.company.internal/api
```

WAR/JAR summary:

| Artifact | Strengths | Weaknesses | Recommendation |
|---|---|---|---|
| WAR | Matches external Tomcat operations, familiar enterprise deployment, easy to version as artifact | Requires container configuration discipline | Recommended |
| Executable JAR | Self-contained runtime, simple local execution | Less aligned with external Tomcat mandate | Defer unless operations prefers it |

## 7. Final Package Structure

Recommended package structure:

```text
com.company.effort
  EffortApiApplication
  config
    WebConfig
    JacksonConfig
    DataSourceConfig
    TransactionConfig
  web
    filter
      RequestIdFilter
      RequestLoggingFilter
    exception
      GlobalExceptionHandler
    response
      ApiResponse
      ApiErrorResponse
  security
    CurrentUser
    AuthenticationFilter
    PermissionInterceptor
    PermissionService
    ProjectScopeService
  audit
    AuditService
    AuditRepository
    AuditEventType
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
    validation
    json
    util
```

Structure rules:

- Domain packages contain controller/service/repository/dto.
- `web` owns request/response/error/filter concerns.
- `security` owns actor, permission, and project scope services.
- `audit` owns authoritative audit writing.
- `common` owns shared validation/json/util helpers.
- Controllers should not contain SQL or project scope logic.
- Repositories should not contain permission logic.

## 8. Profiles, Config, and Secrets

Profiles:

- `local`
- `dev`
- `stage`
- `prod`

Config file candidates:

- `application.yml`
- `application-local.yml`
- `application-dev.yml`
- `application-stage.yml`
- `application-prod.yml`

Environment variables:

- `APP_DB_ENABLED`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `SSO_CLIENT_ID`
- `SSO_CLIENT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CORS_ALLOWED_ORIGINS`
- `APP_ENV`

Rules:

- Do not commit secrets.
- Use Jenkins credentials or an internal secret manager.
- Keep frontend `VITE_*` values separate from backend secrets.
- Treat Vite env values as build-time frontend config.
- Treat backend environment variables as runtime server config.
- Keep DB connectivity disabled by default in the scaffold with
  `APP_DB_ENABLED=false`.
- Enable DB connectivity only in an environment that provides `DB_URL`,
  `DB_USERNAME`, and `DB_PASSWORD`.

Local/dev/stage/prod plan:

| Environment | Purpose | Data | Audit |
|---|---|---|---|
| local | Developer execution | local or dev DB | optional/dev only |
| dev | Shared development API | dev DB | enabled for API behavior checks |
| stage | Pre-production validation | stage DB | production-like |
| prod | Production | prod DB | authoritative |

## 9. JSON, Response, and Error Policy

JSON policy:

- Configure Jackson snake_case serialization.
- Keep API DTO fields aligned with frontend adapter shapes.
- Preserve numeric strings when needed for bigint-compatible ids.

Response policy:

- `ApiResponse.ok(data, requestId)`
- `ApiResponse.error(code, message, details, requestId)`

Request id policy:

- `RequestIdFilter` reads `X-Request-Id`.
- If absent, backend generates request id.
- Request id is returned in `meta.request_id` or `error.request_id`.
- Request id is included in logs and audit rows.

Error policy:

- Validation failure: `VALIDATION_ERROR`
- Permission denied: `FORBIDDEN`
- Unauthenticated: `UNAUTHORIZED`
- Missing resource/logical reference: `NOT_FOUND`
- Business rule rejection: `BUSINESS_RULE_VIOLATION`
- Unexpected failure: `INTERNAL_ERROR`

All errors should follow `docs/tomcat-api-contract.md`.

## 10. Auth and Permission Direction

Development options:

- Mock user profile
- Dev-only header-based actor

Development shortcuts must not become production security.

Production options:

- Internal SSO
- OIDC
- SAML
- JWT

Recommended direction:

- Follow the company SSO standard.
- Create `CurrentUser` in `AuthenticationFilter`.
- Build `PermissionSnapshot` from `app_user_roles` and
  `app_role_permissions`.
- Use `PermissionInterceptor` for endpoint permission checks.
- Use `ProjectScopeService` inside services for project read/write scope.

Important policy:

- Do not auto-allow solely because a role is named `system_admin`.
- Prefer permission-set based checks.
- Seed/configure `system_admin` with all required permissions.

## 11. Audit Direction

Audit implementation direction:

- `AuditService` is called from service layer.
- Backend is authoritative in API mode.
- Frontend audit should be disabled in production API mode.
- Include `request_id`, actor, IP, and user agent.

Recommended success audit policy:

- Business write success audit should be written in the same transaction where
  practical.
- If same-transaction audit is too risky operationally, use durable
  after-commit/outbox behavior.

Failure audit policy:

- Failure audit can be best-effort in a separate transaction.
- Failure audit should not mask the original error.

Required audit event families:

- project create/update/archive/restore/version
- standard effort solution/item/actual
- standard effort meta base/coefficient/active
- export download
- role assign/revoke

## 12. Migration Direction

Current frontend repository contains SQL migration files. Backend cutover needs
a controlled migration ownership decision.

Options:

- Flyway
- Liquibase
- Jenkins manual SQL apply

| Option | Strengths | Weaknesses | Fit |
|---|---|---|---|
| Flyway | Simple ordered SQL migrations, close to current SQL file workflow | Rollback is usually forward-fix oriented | Recommended default |
| Liquibase | Rich change tracking and rollback metadata | More complex authoring model | Good if company standard exists |
| Jenkins manual SQL apply | Simple start, no extra framework | Harder auditability/repeatability | Transitional only |

Recommendation:

- Use the internal standard if one exists.
- If no standard exists, evaluate Flyway first.
- Preserve migration naming/ordering discipline.
- Avoid destructive migrations.
- Prefer additive/corrective migrations and forward fixes.

## 13. Jenkins and GitLab Direction

Backend Jenkins stages:

1. checkout
2. test
3. package WAR
4. publish artifact
5. deploy to dev Tomcat
6. smoke test
7. stage deploy approval
8. prod deploy approval

Frontend Jenkins stages:

1. npm ci
2. npm.cmd run test:run
3. npm.cmd run build
4. publish `dist` artifact
5. deploy static artifact

DB migration stages:

1. migration validate
2. dry run
3. stage apply
4. smoke
5. prod approval

Branch strategy candidate:

- `feature/*`
- `develop`
- `release/*`
- `main`
- `hotfix/*`

## 14. Backend Scaffold Phase Proposal

### Phase 9-C

- Decide whether to create the actual backend scaffold.
- If approved, create Maven/Spring Boot WAR skeleton.
- No domain endpoint behavior yet.

### Phase 9-D

- Add common web layer scaffold:
  - `ApiResponse`
  - `RequestIdFilter`
  - `GlobalExceptionHandler`
- No DB write behavior yet.

### Phase 9-E

- Add DB config and health endpoint.
- Verify PostgreSQL connectivity.
- No business endpoint behavior yet.
- Keep `/api/internal/db-health` internal and return `DISABLED`, `UP`, or
  `DOWN` through the common response wrapper.

### Phase 9-F

- Add auth/permission skeleton:
  - `GET /api/me`
  - `GET /api/me/permissions`

### Phase 9-G

- Add standard effort read API:
  - `GET /api/standard-effort/meta`
  - `GET /api/projects/{projectId}/standard-effort`

### Phase 9-H

- Add standard effort write API:
  - solution selection
  - item selection
  - actual effort
  - backend audit

Each scaffold phase should explicitly state allowed files, forbidden files, and
tests before implementation begins.

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Internal standard conflicts with recommended stack | Treat this document as default guidance; override with internal standard when confirmed. |
| External Tomcat WAR vs embedded JAR confusion | Choose WAR for first scaffold because Apache + Tomcat is the target operating assumption. |
| MyBatis/JdbcTemplate/JPA decision stalls | Pick MyBatis when team has mapper experience; otherwise pick JdbcTemplate for minimal abstraction. |
| JSON snake_case missing | Add serialization tests in common web layer phase. |
| Request id missing | Add request id filter tests and response wrapper tests. |
| Permission middleware missing | Require controller permission tests for every endpoint. |
| Project scope missing in service layer | Centralize and test `ProjectScopeService`. |
| Audit missing or duplicated | Make backend audit authoritative and disable frontend audit in production API mode. |
| Migration ownership unclear | Choose Flyway/Liquibase/manual policy before production DB changes. |
| Frontend `VITE_DATA_BACKEND=api` env confusion | Document build-time frontend env separately from backend runtime env. |
| `project_id` bigint/UUID confusion | Keep project ids as bigint-compatible numbers or numeric strings in API and SQL. |
| M/M unit confusion | Keep standard effort API fields as `*_mm`; do not convert M/D and M/M. |
| Archived project writes allowed | Add archived write guards and service tests. |
| Export exposes sensitive data | Enforce export permissions, project read scope, and `export.download` audit. |
| Rollback unclear | Version frontend/backend artifacts and prefer DB forward-fix. |

## 16. Phase 9-B Scope Confirmation

This phase adds only this decision document.

It does not modify or create:

- Java source code
- Spring project files
- `pom.xml`
- `build.gradle`
- `application.yml`
- `web.xml`
- `Jenkinsfile`
- `src/**`
- `db/migrations/**`
- `db/seeds/**`
- `scripts/**`
- `package.json`
- `package-lock.json`
- Tomcat API endpoints
- frontend API adapters
