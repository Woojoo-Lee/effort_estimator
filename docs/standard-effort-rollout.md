# Standard Effort Rollout

## Interim Operating Path

Until an internal dev/stage PostgreSQL database is prepared for Tomcat API
smoke, continue Standard Effort development and validation in Supabase mode:

```env
VITE_DATA_BACKEND=supabase
VITE_FEATURE_STANDARD_EFFORT=true
VITE_STANDARD_EFFORT_MODE=standard
VITE_AUTH_PERMISSION_MODE=disabled
VITE_AUTH_LOGIN_MODE=disabled
VITE_FRONTEND_AUDIT_MODE=auto
VITE_FEATURE_STANDARD_EFFORT_META=true
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Do not document real Supabase URL/key values, and never expose a service role
key in frontend env. Restart the Vite dev server or rebuild after env changes.

Tomcat API DB smoke is deferred until `APP_DB_ENABLED=true`, DB credentials,
migrations, seed data, `app_audit_logs`, `app_project_members`, and dedicated
smoke IDs are ready. The current backend runtime target is DB-disabled basic
smoke only: `/health`, `/internal/db-health`, `/me`, and `/me/permissions`.
Standard Effort DB-backed API endpoints should return `SERVICE_UNAVAILABLE`
when DB access is disabled rather than fake data.

See [Standard Effort API Smoke Result](./standard-effort-api-smoke-result.md)
for the current deferred status and reopen conditions.

See [Supabase Mode Interim Smoke Result](./supabase-mode-interim-smoke-result.md)
for the current Supabase-mode preflight result, manual browser smoke checklist,
and the Standard Effort Supabase export implementation/smoke status while
`VITE_DATA_BACKEND=supabase` remains the active development path.

See [Standard Effort June Sign-Off](./standard-effort-june-signoff.md) for the
end-of-June first-completion scope, verification summary, limitations, and
follow-up transition work.

See [Standard Effort June Report Package](./standard-effort-june-report-package.md)
for the team lead sharing summary, demo checklist, decisions, and July follow-up
plan.

See [Auth, Permission, And Audit Actor Minimum Scope](./auth-permission-audit-minimum-scope.md)
for the June minimum login, `admin` / `sales` / `viewer` permission, and audit
actor scope.

See [Release Checkpoint And Local Preview Smoke](./release-checkpoint-local-preview.md)
for the current Supabase-mode frontend release checkpoint, local preview smoke,
env matrix, and known deployment limitations.

## Frontend Login Rollout

`VITE_AUTH_LOGIN_MODE` controls the minimum frontend login/session skeleton.
It is separate from `VITE_AUTH_PERMISSION_MODE`.

- `disabled`: default. The current app remains available without login.
- `supabase`: use Supabase Auth email/password session state. Missing sessions
  show the login page; authenticated sessions can use the app and logout.

For the June minimum path, keep `disabled` unless the manually managed Supabase
Auth users are ready. Role and permission enforcement is handled separately in
the next phases.

The `admin` / `sales` / `viewer` role permission resolver is available as a
pure auth utility. UI route/menu/button/read-only enforcement is applied for
the Supabase-mode June path: `admin` can access Standard Effort meta, `sales`
can save solution/item selections but cannot edit `actual_effort_mm`, and
`viewer` remains read-only.

## Frontend Audit Rollout

`VITE_FRONTEND_AUDIT_MODE` controls whether frontend safe audit rows are
written during the Supabase-to-API transition.

- `auto`: Supabase backend writes frontend audit; API backend skips frontend audit.
- `enabled`: always write frontend audit rows.
- `disabled`: never write frontend audit rows.
- `shadow`: write frontend audit rows with `metadata_json.frontend_shadow=true`.

Recommended rollout values:

- Supabase development
  - `VITE_DATA_BACKEND=supabase`
  - `VITE_FRONTEND_AUDIT_MODE=auto`
- API proof of concept
  - `VITE_DATA_BACKEND=api`
  - `VITE_FRONTEND_AUDIT_MODE=shadow` or `disabled`
- Production API
  - `VITE_DATA_BACKEND=api`
  - `VITE_FRONTEND_AUDIT_MODE=disabled`

Frontend audit is a non-blocking transition/UX aid. Tomcat API/backend audit is
the authoritative operating target. Do not leave `shadow` mode enabled for
normal operation because it increases audit row noise.

## 목적

Excel 표준공수표 기반 신규 산정 방식을 운영 화면의 기본 경로로 전환하기 위한 설정, 검증, rollback 기준을 정리한다.

## Env 설정

- `VITE_FEATURE_STANDARD_EFFORT`
  - `true`: 표준공수 산출 섹션 사용 가능
  - 그 외 값 또는 미설정: legacy 산출 화면만 사용
- `VITE_STANDARD_EFFORT_MODE`
  - `legacy`: legacy 산출 화면만 표시
  - `parallel`: legacy 산출 화면과 표준공수 산출 섹션을 병행 표시
  - `standard`: 표준공수 산출 섹션을 기본 화면으로 표시하고 legacy 화면은 비교용 접기 영역으로 유지
  - 미설정: `parallel`
  - 알 수 없는 값: `parallel`
- `VITE_FEATURE_STANDARD_EFFORT_META`
  - `true`: 표준공수 메타 관리 route/sidebar 표시
  - 그 외 값 또는 미설정: 메타 관리 화면 숨김

Vite env는 build 시점에 반영된다. 운영 env 변경 후에는 재빌드가 필요하다.

## Mode 설명

- `legacy`
  - 기존 산출 화면만 사용한다.
  - 표준공수 산출 섹션은 렌더링하지 않는다.
  - rollback용 기본 안전 모드다.
- `parallel`
  - 기존 산출 화면과 표준공수 산출 섹션을 함께 표시한다.
  - 운영 전 비교 검증에 적합하다.
- `standard`
  - 표준공수 산출 섹션을 상단 기본 화면으로 표시한다.
  - 기존 산출 화면은 삭제하지 않고 `기존 산출 화면` 접기 영역에 비교용으로 유지한다.
  - legacy RightSidebar는 숨겨 신규 표준공수 산식과 혼동되지 않게 한다.

## 권장 로컬 테스트 설정

```env
VITE_FEATURE_STANDARD_EFFORT=true
VITE_STANDARD_EFFORT_MODE=parallel
VITE_FEATURE_STANDARD_EFFORT_META=true
```

표준공수 기본 화면 전환을 확인할 때는 다음처럼 변경한다.

```env
VITE_FEATURE_STANDARD_EFFORT=true
VITE_STANDARD_EFFORT_MODE=standard
VITE_FEATURE_STANDARD_EFFORT_META=true
```

## 운영 전환 권장 설정

1. 초기 검증: `VITE_FEATURE_STANDARD_EFFORT=true`, `VITE_STANDARD_EFFORT_MODE=parallel`
2. 검증 후 전환: `VITE_FEATURE_STANDARD_EFFORT=true`, `VITE_STANDARD_EFFORT_MODE=standard`
3. Rollback: `VITE_STANDARD_EFFORT_MODE=legacy` 또는 `VITE_FEATURE_STANDARD_EFFORT=false`

Jenkins 또는 배포 파이프라인에서 Vite env를 build 시점에 주입해야 한다. Jenkinsfile 작성은 별도 Phase에서 다룬다.

## Supabase DB 선행 조건

- standard effort schema migration 실행
- Excel 기반 seed SQL 실행
- physical FK 제거 및 `project_id` bigint 보정 corrective migration 실행
- M/M 컬럼명 보정 migration 실행
- 개발용 RLS/policy가 있다면 운영 전 최종 Auth/API/권한관리 정책으로 대체

물리 Foreign Key는 사용하지 않는다. 참조 무결성은 app/repository/API 계층에서 관리한다.

## Smoke Test Checklist

For backend API mode runtime and DB verification, use
[Standard Effort API Smoke Checklist](./standard-effort-api-smoke-checklist.md).

### 산출 화면

- `standard` mode에서 표준공수 산출 섹션이 상단에 표시된다.
- `기존 산출 화면` 접기 영역이 기본 닫힘 상태로 표시된다.
- legacy RightSidebar가 `standard` mode에서 표시되지 않는다.
- 솔루션 선택 저장이 동작한다.
- 기능항목 체크/해제 저장이 동작한다.
- `actual_effort_mm` 입력 후 blur 저장이 동작한다.
- Enter 저장, Escape 되돌리기가 동작한다.
- `표준공수 새로고침`으로 메타 변경 사항을 다시 불러온다.

### 메타 관리 화면

- `#/standard-effort-meta` route가 feature flag true에서 표시된다.
- 기본공수 `effort_mm` row 단위 저장이 동작한다.
- coefficient row 단위 저장이 동작한다.
- solution variant active toggle이 동작한다.
- standard item active toggle이 동작한다.
- 검증 요약에서 row count, 기본공수합, coefficient completeness, 에스원 fixture preview를 확인한다.

### Active 정책

- `active=false` solution variant는 산출 화면에서 제외된다.
- `active=false` standard item은 산출 화면에서 제외된다.
- admin 화면에서는 `active=false` row도 계속 표시된다.

## 주의사항

- 모든 신규 표준공수 공수 단위는 M/M이다.
- `effort_mm`, `actual_effort_mm`, `base_total_mm`, `standard_effort_mm`, `gap_mm` 값은 숫자 변환 없이 사용한다.
- M/D와 M/M 사이의 환산을 적용하지 않는다.
- coefficient는 단위 없는 배율 값이다.
- 프로젝트 selection seed는 만들지 않는다.
- 운영 보안은 Auth/API/권한관리 단계에서 별도로 구현해야 한다.

## Export/Report

Excel export is mode-aware:

- `legacy` mode uses the existing frontend-local legacy XLSX export.
- `parallel` mode uses the existing frontend-local legacy XLSX export.
- `standard` mode with API backend uses the existing API export-data path when
  `VITE_API_BASE_URL` is configured.
- `standard` mode with Supabase backend uses the interim local Standard Effort
  export workflow and must not fall back to legacy export.

Standard effort export uses the API export-data path and frontend workbook
generation. It keeps M/M fields such as `effort_mm`, `actual_effort_mm`,
`standard_effort_mm`, and `gap_mm`; no M/D to M/M conversion is performed.
Frontend export audit is not written. Tomcat should own authoritative
`export.download` audit for API export endpoints.

The standard effort export API endpoint is:

- `GET /api/projects/{projectId}/standard-effort/export-data`

Standard effort export operating conditions:

- `VITE_FEATURE_STANDARD_EFFORT=true`
- `VITE_STANDARD_EFFORT_MODE=standard`
- `VITE_DATA_BACKEND=api` with `VITE_API_BASE_URL` configured, or
  `VITE_DATA_BACKEND=supabase` for the interim local export path.

Supabase backend mode now supports an interim local Standard Effort export
workflow. It refetches Standard Effort input from Supabase, calculates the
frontend Standard Effort result, builds workbook output, and downloads through
the shared browser download helper. It must not fall back to legacy export or
the API export workflow.

This Supabase export path is an interim development/reporting path. Production
exports should still use Tomcat API mode with backend authoritative audit.

See [Supabase Standard Effort Export Design](./supabase-standard-effort-export-design.md)
for the local export path. Phase 10-B-3 connects it to
`useExportManager.downloadExcel`; browser/file smoke is still tracked
separately.
Phase 10-B-1 has added pure export-data mapper helpers only; repository fetch,
workbook download, Header integration, and runtime export behavior are still
unchanged.
Phase 10-B-2 has added the Supabase Standard Effort workbook preparation
workflow helper, but browser download, Header integration, and runtime export
behavior are still unchanged.
Phase 10-B-3 has added the Supabase download helper and connected
`standard + supabase` export through `useExportManager`. Header still calls
the existing `actions.downloadExcel` action shape.
Phase 10-B-4 has browser/file-smoked the Supabase Standard Effort export path:
download, filename, workbook sheets, M/M totals, WFM result row, and checked
item rows passed.
Phase 10-C-1 improves the Standard Effort meta admin coefficient grid UX with
a top horizontal scrollbar and wider page layout. Save, dirty, read-only, audit,
and coefficient payload behavior are unchanged.

Standard effort export smoke checklist:

1. Select a project in standard mode with API or Supabase backend enabled.
2. Click the Header Excel download button.
3. Confirm an `.xlsx` file downloads.
4. Confirm workbook sheets for summary, solution phase effort, and checked
   items.
5. Confirm `standard_effort_mm`, `actual_effort_mm`, and `gap_mm` values are
   present and remain M/M values.
6. Confirm Tomcat writes authoritative `export.download` audit.
7. Confirm legacy and parallel modes still use the existing legacy export.

## Rollback 방법

- 병행 표시로 되돌리기: `VITE_STANDARD_EFFORT_MODE=parallel`
- legacy 화면만 사용: `VITE_STANDARD_EFFORT_MODE=legacy`
- 표준공수 기능 전체 비활성화: `VITE_FEATURE_STANDARD_EFFORT=false`

env 변경 후에는 Vite 앱을 재빌드하고 배포한다.
