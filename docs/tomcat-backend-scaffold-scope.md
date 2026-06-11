# Tomcat Backend Scaffold Scope

## 1. Purpose

This document freezes the decisions that must be made before creating the
actual Java/Tomcat backend scaffold.

The goal is to avoid generating a scaffold with the wrong Spring, Servlet, Java,
Tomcat, packaging, context-path, or repository layout assumptions.

This phase is documentation only. It does not create backend source code,
Spring project files, Maven/Gradle files, Tomcat configuration, Jenkins files,
frontend source files, migrations, or seeds.

Phase 9-D should use this document to decide whether it is safe to create the
minimal backend scaffold or whether another template-only/documentation phase is
needed first.

## 2. Currently Unconfirmed Values

| Item | Current status | Recommended value | Needs confirmation | Decision impact |
|---|---|---|---|---|
| Tomcat major version | Unknown | Tomcat 10.1+ if Spring Boot 3.x is selected | Yes | Determines Jakarta vs javax Servlet namespace. |
| Java version | Unknown | Java 17+ for Spring Boot 3.x | Yes | Determines Spring Boot version and Jenkins agent requirements. |
| Spring standard | Unknown | Spring Boot 3.x WAR if Tomcat 10.1+; company Spring MVC WAR if mandated | Yes | Determines scaffold files and dependencies. |
| Maven/Gradle standard | Unknown | Maven if no internal standard exists | Yes | Determines build files and Jenkins commands. |
| DB access standard | Unknown | MyBatis when team has mapper experience; otherwise JdbcTemplate | Yes | Should be deferred until DB phase if uncertain. |
| Backend repo location | Unknown | `backend/` submodule for PoC; separate repo possible for operations | Yes | Determines file creation path in Phase 9-D. |
| WAR context path | Unknown | `/effort-api` candidate | Yes | Affects Tomcat deployment and reverse proxy mapping. |
| API base path | Contracted as `/api` | Controller base path `/api` | Low | Affects controller mappings and frontend `VITE_API_BASE_URL`. |
| DB migration tool | Unknown | Flyway if no internal standard exists | Yes | Determines future migration ownership. |
| Jenkins deploy target | Unknown | Tomcat deploy directory or managed deploy step | Yes | Determines pipeline implementation. |

Decision rule:

- If Tomcat, Java, build tool, backend location, and artifact naming are still
  unconfirmed, Phase 9-D should not create Java source files.
- If these values are confirmed, Phase 9-D may create the common web scaffold
  only, with no domain endpoints and no DB writes.

## 3. Tomcat and Spring Compatibility Checklist

The Servlet namespace is the critical compatibility decision.

| Runtime | Servlet namespace | Compatible Spring direction | Scaffold guidance |
|---|---|---|---|
| Tomcat 10.1+ | `jakarta.*` | Spring Boot 3.x or Spring Framework 6.x | Safe candidate for Spring Boot 3.x WAR. |
| Tomcat 10.0 | `jakarta.*` | Transitional Jakarta stack | Prefer Tomcat 10.1+ instead of targeting 10.0. |
| Tomcat 9.x | `javax.*` | Spring Boot 2.x or Spring Framework 5.x | Do not create Spring Boot 3.x WAR scaffold. Confirm company standard. |
| Tomcat 8.5 or older | `javax.*` | Legacy Spring stack | Treat as legacy platform; require separate architecture decision. |

Important rules:

- Spring Boot 3.x is Jakarta based and requires Java 17+.
- Spring Boot 3.x WAR should not be targeted to Tomcat 9 because Tomcat 9 uses
  the `javax.*` Servlet API.
- Spring Boot 2.x is `javax.*` based, but new development on that line needs
  internal lifecycle and support confirmation.
- When Tomcat version is unknown, do not create the actual scaffold.

Recommended decision:

- If Tomcat 10.1+ is confirmed: use Spring Boot 3.x WAR.
- If Tomcat 9 is confirmed: pause Spring Boot 3.x scaffold and choose either
  company-standard Spring MVC WAR or a separate javax-compatible plan.
- If Tomcat major version is unknown: Phase 9-D should remain documentation or
  template-only, not code generation.

Phase 9-D prerequisite:

- Confirm Tomcat major version and Servlet namespace.

## 4. Java Version Policy

Candidates:

- Java 17
- Java 21
- Company-standard JDK

Recommendation:

- Follow the company-standard JDK if one exists.
- If Spring Boot 3.x is selected, use Java 17+.
- Prefer Java 17 for the initial scaffold unless the company already operates
  Java 21 on Tomcat/Jenkins.
- Keep local developer JDK, Jenkins agent JDK, and Tomcat runtime JDK aligned.

Phase 9-D prerequisite:

- Confirm Jenkins agent JDK.
- Confirm Tomcat runtime JDK.
- Confirm developer local JDK guidance.

## 5. Backend Module Location Policy

### Option A: `backend/` submodule inside this repository

Strengths:

- Frontend and backend contract can evolve in one merge request.
- Easier early PoC coordination.
- Simplifies adapter/contract document updates during the transition.

Tradeoffs:

- Frontend Node lifecycle and backend Maven lifecycle must be separated.
- Jenkins must run frontend and backend pipelines independently or in separate
  stages.
- Repository can become heavier.

### Option B: Separate backend repository

Strengths:

- Clear operational ownership.
- Independent backend lifecycle and release cadence.
- Cleaner Jenkins pipeline separation.

Tradeoffs:

- Contract synchronization becomes more manual.
- Early PoC coordination is slower.
- Cross-repo changes need stricter release discipline.

Recommendation:

- Use `backend/` inside the current repo for the initial PoC only if the team
  wants fast contract iteration.
- Move to, or start with, a separate backend repository if internal operations
  requires clear repository separation.
- Phase 9-D should treat `backend/` as the default scaffold candidate unless
  the user explicitly chooses a separate repository.

## 6. WAR Context and API Base Path

Definitions:

- WAR context path: Tomcat application context, such as `/effort-api`.
- API base path: controller route prefix, such as `/api`.
- Frontend API base URL: `VITE_API_BASE_URL`, usually set to the reverse proxy
  URL visible to the browser.

Recommended defaults:

- Artifact name: `effort-api.war`
- Tomcat context path candidate: `/effort-api`
- Controller base path: `/api`

Example deployment mapping:

```text
Browser -> Apache /api/* -> Tomcat /effort-api/api/*
```

Example frontend env values:

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=/api
```

or for direct dev access:

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=http://localhost:8080/effort-api/api
```

Rules:

- Do not confuse WAR context path with controller base path.
- Controllers should use `/api` as the application API prefix.
- Reverse proxy may hide the WAR context path from the browser.
- `VITE_API_BASE_URL` should be set to the browser-visible base URL, not
  necessarily the internal Tomcat context path.

## 7. Phase 9-D Scaffold File Candidates

If prerequisites are confirmed, Phase 9-D may create the following minimal
common web scaffold files:

```text
backend/pom.xml
backend/src/main/java/com/company/effort/EffortApiApplication.java
backend/src/main/java/com/company/effort/ServletInitializer.java
backend/src/main/java/com/company/effort/web/response/ApiResponse.java
backend/src/main/java/com/company/effort/web/response/ApiErrorResponse.java
backend/src/main/java/com/company/effort/web/exception/GlobalExceptionHandler.java
backend/src/main/java/com/company/effort/web/filter/RequestIdFilter.java
backend/src/main/java/com/company/effort/web/controller/HealthController.java
backend/src/main/resources/application.yml
backend/src/test/java/com/company/effort/web/controller/HealthControllerTest.java
```

Optional supporting files:

```text
backend/README.md
backend/.gitignore
```

Phase 9-D should not create:

- DB connection implementation
- domain controllers
- project endpoints
- standard effort endpoints
- auth/permission implementation
- audit DB insert implementation
- MyBatis mappers
- Flyway migrations
- Jenkinsfile

## 8. Phase 9-D Dependency Candidates

Maven dependency candidates for a common web scaffold:

- `spring-boot-starter-web`
- `spring-boot-starter-validation`
- `spring-boot-starter-test`
- provided Tomcat dependency for WAR packaging, depending on Spring Boot setup

Dependencies to defer until DB phase:

- `spring-boot-starter-jdbc`
- `mybatis-spring-boot-starter`
- PostgreSQL JDBC driver
- Flyway or Liquibase

Reason to defer DB dependencies:

- Phase 9-D is common web skeleton only.
- Adding DB dependencies too early can force incomplete local config.
- DB connectivity should be handled in a separate phase with explicit
  environment variables and health checks.

## 9. Common Web Skeleton Requirements

Phase 9-D common web scaffold should include:

- `/api/health`
- success response wrapper
- error response wrapper
- request id filter
- global exception handler
- basic validation error shape if validation dependency is included
- JSON snake_case policy candidate

`RequestIdFilter` requirements:

- Read incoming `X-Request-Id`.
- Generate a request id when missing.
- Set `X-Request-Id` response header.
- Make request id available to response wrappers and logs.

`GlobalExceptionHandler` requirements:

- Unknown exception returns `INTERNAL_ERROR` wrapper.
- Validation exception returns `VALIDATION_ERROR` wrapper when validation is
  wired.
- Error wrapper shape must match `docs/tomcat-api-contract.md`.

`HealthController` requirements:

- `GET /api/health`
- no DB dependency in Phase 9-D
- returns `ApiResponse.ok(...)`

## 10. Phase 9-D Test Requirements

Backend tests, if scaffold is created:

- Health endpoint returns `ok=true` response wrapper.
- Provided `X-Request-Id` is passed through.
- Missing `X-Request-Id` generates a response request id.
- Unknown exception returns error wrapper.
- Maven test command passes.

Frontend repository tests still required:

- `npm.cmd run test:run`
- `npm.cmd run build`

Reason:

- Backend scaffold must not break the existing frontend workspace.
- Frontend API adapters remain contract-driven and should not be modified by
  scaffold creation.

## 11. Phase 9-D Execution Prerequisites

Required confirmations before creating actual Java files:

- Tomcat major version.
- Servlet namespace expectation: Jakarta or javax.
- JDK version for local, Jenkins, and Tomcat.
- Maven or Gradle preference.
- Backend module location: current repo `backend/` or separate repo.
- Java base package name.
- Artifact name.
- WAR context path.
- Browser-visible API base URL strategy.

If these are not confirmed:

- Do not create the Java scaffold yet.
- Create only a backend scaffold template document or request confirmation.

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Tomcat 9/10 Servlet namespace mismatch | Confirm Tomcat major version before scaffold. Do not run Spring Boot 3 on Tomcat 9. |
| Spring Boot 3 WAR deployed to Tomcat 9 | Block scaffold until Tomcat 10.1+ or compatible alternative is confirmed. |
| Java/Jenkins version mismatch | Confirm Jenkins agent JDK and Tomcat runtime JDK before choosing Java version. |
| WAR context path and `/api` base path confusion | Document context path and controller base path separately; set `VITE_API_BASE_URL` to browser-visible URL. |
| Frontend `VITE_API_BASE_URL` misconfiguration | Include dev/stage/prod env examples and smoke tests. |
| Backend scaffold affects frontend build | Keep backend under isolated `backend/`; do not modify frontend package files. |
| Maven/Gradle decision conflicts with internal standard | Follow internal standard when known; otherwise default to Maven. |
| DB dependency added too early | Defer DB dependencies to the DB health/connectivity phase. |
| Jenkins pipeline separation unclear | Keep Jenkinsfile out of Phase 9-D and document pipeline separately. |
| Separate repo chosen after `backend/` scaffold | Treat current-repo scaffold as PoC only and keep package/files portable. |

## 13. Final Recommendation

If Tomcat 10.1+ is confirmed:

- Use Spring Boot 3.x WAR.
- Use Java 17+.
- Use Maven unless internal standards require Gradle.
- Use `backend/` as the initial PoC module location unless operations requires
  a separate repository.
- Use `com.company.effort` as the initial package placeholder.
- Use `effort-api.war` as the artifact name.
- Use `/api` as the controller base path.
- Use `/effort-api` as the Tomcat context path candidate.
- Configure frontend `VITE_API_BASE_URL` to the browser-visible reverse proxy
  URL.

If Tomcat 9 is confirmed:

- Do not create a Spring Boot 3.x scaffold.
- Confirm whether the company requires Spring MVC WAR or another
  javax-compatible stack.
- Revisit Java and Spring versions before Phase 9-D.

If Tomcat major version remains unknown:

- Do not create backend Java files in Phase 9-D.
- Continue with template documentation or request the missing environment
  decisions first.

## 14. Phase 9-C Scope Confirmation

This phase adds only this scaffold scope document.

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
- backend scaffold files
