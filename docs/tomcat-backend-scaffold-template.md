# Tomcat Backend Scaffold Template

## 1. Purpose

This document is a template and checklist for the first real backend scaffold
phase.

It prevents Java/Tomcat backend files from being generated before Tomcat, JDK,
Servlet namespace, build tool, module location, and deployment assumptions are
confirmed.

This phase is documentation only. It does not create:

- `backend/`
- Java source files
- `pom.xml`
- `build.gradle`
- `application.yml`
- `web.xml`
- `Jenkinsfile`
- frontend source changes
- DB migrations or seeds

The candidate scaffold described here assumes Spring Boot 3.x WAR, but that
candidate is valid only after Tomcat 10.1+ and Java 17+ are confirmed.

## 2. Decision Gate

Phase 9-D must confirm these values before creating actual scaffold files.

| Item | Recommended value | Actual decision | Confirmed | Notes |
|---|---|---|---|---|
| Tomcat major version | Tomcat 10.1+ | TBD | No | Determines `jakarta.*` vs `javax.*`. |
| Tomcat Servlet namespace | `jakarta.*` for Tomcat 10.1+ | TBD | No | Spring Boot 3.x requires Jakarta. |
| JDK version | Java 17+ | TBD | No | Align local, Jenkins, and Tomcat runtime JDK. |
| Build tool | Maven | TBD | No | Follow internal standard if one exists. |
| Backend repo location | Current repo `backend/` for PoC | TBD | No | Separate repo is still possible. |
| Java base package | `com.company.effort` | TBD | No | Replace placeholder if company package is known. |
| WAR artifact name | `effort-api.war` | TBD | No | Used by Jenkins/Tomcat deploy. |
| Tomcat context path | `/effort-api` candidate | TBD | No | Separate from controller `/api` base path. |
| API base path | `/api` | `/api` | Yes | Matches frontend API adapter contracts. |
| Jenkins deploy target | Tomcat deploy directory or managed deploy step | TBD | No | Determines pipeline implementation. |
| DB migration ownership | Flyway candidate | TBD | No | Not needed in common web scaffold. |

Decision rule:

- If Tomcat 10.1+, Jakarta Servlet, Java 17+, Maven, backend location, artifact
  name, and context path are confirmed, Phase 9-D may create the minimal common
  web scaffold.
- If Tomcat 9 or `javax.*` is confirmed, do not use the Spring Boot 3.x WAR
  template.
- If Tomcat major version remains unknown, do not create backend Java files.

## 3. Spring Boot 3.x WAR Candidate Structure

The following structure is a candidate only. Do not create these files until
Phase 9-D is explicitly approved.

```text
backend/
  pom.xml
  README.md
  .gitignore
  src/
    main/
      java/
        com/
          company/
            effort/
              EffortApiApplication.java
              ServletInitializer.java
              web/
                controller/
                  HealthController.java
                exception/
                  GlobalExceptionHandler.java
                filter/
                  RequestIdFilter.java
                response/
                  ApiResponse.java
                  ApiErrorResponse.java
      resources/
        application.yml
    test/
      java/
        com/
          company/
            effort/
              web/
                controller/
                  HealthControllerTest.java
```

This first scaffold should stay intentionally small:

- common web layer only
- health endpoint only
- request id handling only
- response/error wrapper only
- no DB connection
- no auth/permission implementation
- no audit database insert
- no domain endpoints

## 4. `pom.xml` Template Outline

Do not create `pom.xml` in this phase. This is only an outline for Phase 9-D.

Candidate values:

- `groupId`: `com.company`
- `artifactId`: `effort-api`
- `packaging`: `war`
- `java.version`: `17`
- Spring Boot version: decide after Tomcat/JDK confirmation

Candidate dependencies:

- `spring-boot-starter-web`
- `spring-boot-starter-validation`
- `spring-boot-starter-test`
- provided Tomcat dependency for external Tomcat WAR deployment, depending on
  final Spring Boot setup

Dependencies to defer:

- `spring-boot-starter-jdbc`
- `mybatis-spring-boot-starter`
- PostgreSQL JDBC driver
- Flyway or Liquibase

Reason:

- Phase 9-D should create only the common web skeleton.
- DB dependencies should be introduced in the DB connectivity phase to avoid
  forcing incomplete local DB configuration.

Tomcat 9 warning:

- Do not use a Spring Boot 3.x `pom.xml` template for Tomcat 9.
- Tomcat 9 uses `javax.*`; Spring Boot 3.x uses `jakarta.*`.

## 5. `application.yml` Template Outline

Do not create `application.yml` in this phase. This is only an outline.

Candidate config:

```yaml
server:
  servlet:
    context-path: /

spring:
  jackson:
    property-naming-strategy: SNAKE_CASE

app:
  api-base-path: /api
  env: local
  cors:
    allowed-origins: []
  security:
    mode: dev

logging:
  pattern:
    level: "%5p [%X{request_id}]"
```

Rules:

- Do not put secrets in this file.
- Do not add DB config until the DB connectivity phase.
- Keep frontend `VITE_*` values separate from backend runtime secrets.
- `app.api-base-path` is documentation/config support; controllers should still
  map consistently to `/api`.

## 6. Java Class Template Outlines

These are responsibilities only. Do not create Java files in this phase.

### `EffortApiApplication`

- Spring Boot main class.
- Entry point for local/test execution.
- Uses WAR packaging-compatible setup.

### `ServletInitializer`

- Supports deployment to external Tomcat.
- Configures the Spring application builder for WAR deployment.

### `HealthController`

- Maps `GET /api/health`.
- Returns the standard success wrapper.
- Does not depend on DB connectivity in the first scaffold.

Candidate response:

```json
{
  "ok": true,
  "data": {
    "status": "UP"
  },
  "meta": {
    "request_id": "..."
  }
}
```

### `RequestIdFilter`

- Reads incoming `X-Request-Id`.
- Generates a request id when missing.
- Writes `X-Request-Id` response header.
- Makes request id available to response wrappers.
- May integrate with MDC for logging.

### `ApiResponse`

- Provides success wrapper shape:
  - `ok`
  - `data`
  - `meta.request_id`

### `ApiErrorResponse`

- Provides error wrapper shape:
  - `ok=false`
  - `error.code`
  - `error.message`
  - `error.details`
  - `error.request_id`

### `GlobalExceptionHandler`

- Converts unknown exceptions to `INTERNAL_ERROR`.
- Prepares validation errors as `VALIDATION_ERROR`.
- Reserves `FORBIDDEN` and `UNAUTHORIZED` wrappers for later security phases.
- Keeps response shape aligned with `docs/tomcat-api-contract.md`.

## 7. Phase 9-D Actual Scaffold Scope

If the decision gate is cleared, Phase 9-D may create:

- `backend/` submodule
- `backend/pom.xml`
- `EffortApiApplication`
- `ServletInitializer`
- `HealthController`
- `ApiResponse`
- `ApiErrorResponse`
- `RequestIdFilter`
- `GlobalExceptionHandler`
- `application.yml`
- `HealthControllerTest`
- optional `backend/README.md`
- optional `backend/.gitignore`

Phase 9-D must not create:

- DB connection implementation
- domain controllers
- project endpoints
- standard effort endpoints
- auth/permission implementation
- audit DB insert implementation
- MyBatis mappers
- Flyway migrations
- Jenkinsfile

## 8. Tomcat 9 Response Plan

If Tomcat 9 is confirmed:

- Do not create a Spring Boot 3.x WAR scaffold.
- Confirm whether the company has a Spring MVC WAR standard.
- Evaluate a `javax.*` compatible stack before generating files.
- Consider whether upgrading to Tomcat 10.1+ is feasible.
- Treat Spring Boot 2.x as a maintenance-risk option that requires explicit
  lifecycle approval.

Recommendation:

- Do not generate Java code until the company platform decision is confirmed.

## 9. Local Execution Candidates

If Spring Boot 3.x WAR is confirmed later, local commands may be:

```powershell
mvn test
mvn package
```

External Tomcat smoke candidate:

```powershell
curl http://localhost:8080/effort-api/api/health
```

Reverse proxy smoke candidate:

```powershell
curl http://localhost:8080/api/health
```

These commands are candidates only. Do not assume they work before the scaffold
exists and the local runtime is confirmed.

## 10. Jenkins Candidate

Phase 9-D should not create `Jenkinsfile`.

Later backend Jenkins stages may be:

- backend unit test
- package WAR
- archive artifact
- deploy dev Tomcat
- health smoke

No DB migration stage is needed for the common web skeleton.

## 11. Frontend Integration Candidate

Frontend API mode candidates:

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=http://localhost:8080/effort-api/api
```

or through reverse proxy:

```env
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=http://localhost:8080/api
```

Initial frontend smoke:

- Directly verify `/api/health`.
- Do not expect standard effort API calls to succeed until later backend domain
  phases.
- Do not modify frontend API adapters in the scaffold phase.

## 12. Phase 9-D Completion Criteria

If Phase 9-D creates actual scaffold files, completion criteria should be:

- backend scaffold files generated
- Maven test passes
- Maven package creates WAR
- health endpoint test passes
- frontend `npm.cmd run test:run` passes
- frontend `npm.cmd run build` passes
- no domain endpoint exists yet
- no DB config exists yet
- no frontend source changes are required

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Tomcat 9/10 mismatch | Require Tomcat major version before generating files. |
| Spring Boot 3 deployed to Tomcat 9 | Block Spring Boot 3 scaffold when Tomcat 9 is confirmed. |
| JDK mismatch | Confirm local, Jenkins, and Tomcat JDK before choosing Java version. |
| Context path and API base path confusion | Keep `/effort-api` context and `/api` controller base path separate. |
| `backend/` affects frontend build | Keep backend module isolated and avoid modifying frontend package files. |
| Maven proxy/repository issue | Confirm internal Maven repository access before scaffold execution. |
| Secrets accidentally committed | Do not include secrets in templates or docs. |
| DB dependency introduced too early | Defer DB dependencies to DB connectivity phase. |
| Jenkins deploy target unknown | Keep Jenkinsfile out of the scaffold template phase. |

## 14. Phase 9-D Preflight Checklist

Before generating files, confirm:

- [ ] Tomcat major version
- [ ] Servlet namespace
- [ ] JDK version
- [ ] Maven or Gradle
- [ ] backend module location
- [ ] Java base package
- [ ] artifact name
- [ ] Tomcat context path
- [ ] browser-visible API base URL
- [ ] Jenkins deploy target
- [ ] internal Maven repository/proxy access

If any required item is unknown, Phase 9-D should stop before file creation.

## 15. Phase 9-D File Creation Checklist

If the decision gate passes, create only the approved common web scaffold files:

- [ ] `backend/pom.xml`
- [ ] `EffortApiApplication.java`
- [ ] `ServletInitializer.java`
- [ ] `HealthController.java`
- [ ] `RequestIdFilter.java`
- [ ] `ApiResponse.java`
- [ ] `ApiErrorResponse.java`
- [ ] `GlobalExceptionHandler.java`
- [ ] `application.yml`
- [ ] `HealthControllerTest.java`
- [ ] optional `backend/README.md`
- [ ] optional `backend/.gitignore`

Do not add domain, DB, auth, audit, migration, or Jenkins files in that phase.

## 16. Phase 9-D Expected Commands

Backend commands after scaffold exists:

```powershell
mvn test
mvn package
```

Frontend commands that should still pass:

```powershell
npm.cmd run test:run
npm.cmd run build
```

If Maven or Java is not available locally, document the blocker and do not
substitute unrelated frontend tests for backend scaffold verification.

## 17. Phase 9-D Handoff Summary

Phase 9-D should create real files only when these conditions are true:

- Tomcat 10.1+ is confirmed, or an approved non-Boot-3 compatible plan exists.
- Java 17+ is confirmed for Spring Boot 3.x.
- Maven is confirmed or replaced by an internal standard.
- `backend/` or separate repo location is explicitly chosen.
- Artifact and context path are confirmed.

Until then, backend scaffold work remains documentation-only.
