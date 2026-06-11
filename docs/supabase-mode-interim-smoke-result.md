# Supabase Mode Interim Smoke Result

## 1. Purpose

This document records the current interim validation path while Tomcat API DB
smoke is deferred. Until an internal dev/stage PostgreSQL database is ready,
day-to-day Standard Effort development and validation remains on the
React/Vite frontend with direct Supabase repositories.

Phase 10-A-R-2 updates the prior SKIP/PENDING browser and SQL smoke entries
with the user-provided Supabase browser/SQL Editor smoke evidence. No frontend
source, backend source, migration, seed, export behavior, or package files were
changed.

Phase 10-A-R-3 attempted to automate the remaining actual effort and refresh
browser smoke with local Vite plus headless Chrome. The read-only setup path
confirmed project 7 selection and the WFM actual effort input, but the write
automation did not complete reliably. No additional actual effort write result
is promoted to PASS in this document from Phase 10-A-R-3.

Phase 10-A-R-3M adds user-provided manual browser and Supabase SQL evidence for
the WFM `actual_effort_mm` path. General actual effort save, onBlur save,
Escape rollback, empty draft to zero, refresh, and actual effort audit are now
documented from the manual smoke. Enter-specific save remains SKIP because it
was not separately confirmed.

Phase 10-A-Fix-1 addresses the follow-up observation that
`estimation_project_solution_selection.updated_at` did not change while
`actual_effort_mm` changed. The Supabase Standard Effort write repository now
explicitly sends an ISO `updated_at` value for solution selection, item
selection, and actual effort writes. This is recorded as fix implemented,
re-smoke pending; no SQL PASS is promoted until a new browser/Supabase smoke
confirms the timestamp behavior.

Phase 10-A-R-3U-close closes the immediate updated_at re-smoke as
WAIVED/DEFERRED. The updated_at field remains a useful tracking field, but it
is not treated as a blocking item for the June Supabase interim close because
the solution/item/actual save paths and frontend audit evidence are already
confirmed. Phase 10-A-Fix-1 remains implemented, and updated_at PASS/FAIL
verification can be reopened in a separate focused phase.

Phase 10-A-R-4 adds the user-provided manual Supabase mode meta admin
save/restore smoke evidence. Meta admin load, base effort save/restore,
coefficient save/restore, variant active toggle restore, item active toggle
restore, and meta admin frontend audit are documented as PASS. All edited
values were restored to their original values.

Phase 10-A-R-4-Gate closes the test/build gate as PASS after rerun. An initial
`npm.cmd run test:run` timeout/failure was observed after the R-4 documentation
update, but the targeted rerun for the affected UI tests passed, the full test
rerun passed, and the production build passed. The remaining stderr/warnings
were non-blocking and expected from existing error-path tests or React test
warnings.

Phase 10-B-4 runs the Supabase mode Standard Effort export browser/file smoke.
Chrome headless opened the local Vite app, selected `PROJECT_ID=7`, clicked the
Header Excel download button, downloaded an `.xlsx` file, and verified workbook
sheets and key M/M values through the existing `xlsx` parser. The previous
standard+supabase export limitation is now treated as resolved, with network
fallback capture noted as partial because the successful download pass did not
record full network events.

Overall result for this run:

- Supabase env key presence: PASS, with secret values masked.
- Frontend automated preflight: PASS.
- Project list/select: PASS.
- Standard Effort section load: PASS.
- Solution toggle save: PASS.
- Item checkbox save: PASS.
- `actual_effort_mm` save: PASS.
- Refresh: PASS.
- Meta admin load: PASS.
- Base effort save/restore: PASS.
- Coefficient save/restore: PASS.
- Active toggle save/restore: PASS.
- Frontend audit: PASS.
- Meta admin audit: PASS.
- Standard mode Supabase export: PASS.
- Supabase Standard Effort write `updated_at` re-smoke: WAIVED/DEFERRED,
  non-blocking observation.

Live browser write smoke should be run only against a dedicated local/dev
Supabase project. Do not run write smoke against production data.

## 2. Execution Info

| Item | Result |
|---|---|
| Updated at | 2026-06-10 |
| Executor | User browser/Supabase SQL Editor smoke, documented by Codex |
| Environment | local/dev Supabase interim path |
| Frontend mode | `standard` |
| Data backend | `supabase` |
| Auth permission mode | `disabled` |
| Frontend audit mode | `auto` |
| Secret handling | Supabase URL/key values were not printed or recorded. |

## 3. Smoke IDs

| ID | Value |
|---|---|
| `PROJECT_ID` | `7` |
| `PROJECT_NAME` | Provided in attached smoke result; exact display text not re-recorded because pasted text encoding was unreliable. |
| `SOLUTION_VARIANT_ID` | `d3fd971f-505a-4829-b519-a379b40d034b` |
| `SOLUTION_DISPLAY_NAME` | `WFM` |
| `ITEM_ID` | `7d2973f1-ab47-40ec-a1b1-8f069d96f090` |
| `ITEM_NAME` | Provided in attached smoke result; exact display text not re-recorded because pasted text encoding was unreliable. |
| `ITEM_OPTION` | `NULL` |

Use `estimation_projects.id` as bigint/int8-compatible `project_id`. Do not
convert `project_id` to UUID.

## 4. Env Matrix

`.env.local` key check result from the previous Phase 10-A-R preflight:

| Key | Result |
|---|---|
| `VITE_DATA_BACKEND` | `supabase` |
| `VITE_FEATURE_STANDARD_EFFORT` | `true` |
| `VITE_STANDARD_EFFORT_MODE` | `standard` |
| `VITE_AUTH_PERMISSION_MODE` | `disabled` |
| `VITE_FRONTEND_AUDIT_MODE` | `auto` |
| `VITE_FEATURE_STANDARD_EFFORT_META` | `true` |
| `VITE_SUPABASE_URL` | present, masked |
| `VITE_SUPABASE_ANON_KEY` | present, masked |

Do not document real Supabase URL/key values. Never use or document a Supabase
service role key in frontend env. Restart the Vite dev server or rebuild after
env changes.

## 5. Preflight Test/Build

| Command | Result |
|---|---|
| Initial Phase 10-A-R-4 `npm.cmd run test:run` | OBSERVED TIMEOUT/FAILURE |
| `npm.cmd run test:run -- tests/authActionPermission.test.jsx tests/projectArchiveUi.test.jsx tests/standardEffortComponents.test.jsx` | PASS: 3 files / 40 tests |
| `npm.cmd run test:run` rerun | PASS: 43 files / 676 tests |
| `npm.cmd run build` | PASS |
| Phase 10-B-4 `npm.cmd run test:run` | PASS: 46 files / 713 tests |
| Phase 10-B-4 `npm.cmd run build` | PASS |
| Vite chunk warning | PRESENT: large chunk warning only |
| `dist/index.html` | Restore after build if changed because it is a generated artifact outside this phase scope |

Gate status: PASS after rerun.

Notes:

- `projectArchiveUi.test.jsx` `restore failed` stderr is expected from an
  error-path assertion.
- `standardEffortStore` refresh failed stderr is expected from an error-path
  assertion.
- `useExportManager` standard export failed stderr is expected from an
  error-path assertion.
- React `act(...)` warnings are existing non-blocking test warnings.
- No source code changes were required for the gate close.

Backend Maven commands were not required for this Supabase frontend smoke phase.
The previous backend DB-disabled smoke remains the current backend runtime
record.

## 6. Local Dev Server Preflight

| Check | Result |
|---|---|
| Command | `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort` |
| Vite startup | PASS in Phase 10-A-R |
| Evidence | Vite 5.4.21 ready log at `http://127.0.0.1:5173/` |
| Process cleanup | PASS |

## 6-A. Phase 10-A-R-3 Actual Effort/Refresh Follow-Up Attempt

Result: SKIP for new write evidence.

Read-only browser automation evidence:

- Local Vite and headless Chrome opened the app.
- `PROJECT_ID=7` was selected in the project selector.
- Browser text included `테스트 (ID: 7, 수정일: 2026. 06. 08.)`.
- Standard Effort summary included WFM.
- WFM actual effort input was found with `aria-label="WFM 실투입공수"`.
- The observed WFM actual effort input value before the attempted follow-up
  write was `0`.

Write/refresh follow-up result:

| Check | Result | Evidence |
|---|---|---|
| onBlur save to `4.5` | SKIP | Headless write automation did not complete reliably. |
| Enter save to `5.5` | SKIP | Headless write automation did not complete reliably. |
| Escape revert from `6.5` | SKIP | Headless write automation did not complete reliably. |
| Empty draft to `0` | SKIP | Skipped to avoid extra data changes without stable browser automation. |
| Refresh after save | SKIP | No new saved value was produced by this phase. |
| New SQL verification | SKIP | No confirmed new write was produced by this phase. |
| New audit verification | SKIP | No confirmed new write was produced by this phase. |

Process cleanup:

- Vite/headless Chrome processes started for this attempt were stopped.
- No source, backend, migration, seed, or package files were changed.

## 6-B. Phase 10-A-R-3M Manual Actual Effort/Refresh Follow-Up

Result: PASS for manual actual effort save and refresh evidence.

Smoke timestamp:

- `SMOKE_STARTED_AT=2026-06-08 08:19:40.134277+00`

Baseline:

- `actual_effort_mm=0.0000`
- `updated_at=2026-05-25 10:00:37.430547+00`

Manual browser and SQL result:

| Check | Result | Evidence |
|---|---|---|
| General `actual_effort_mm` save | PASS | Manual WFM edits were confirmed in Supabase as `20.0000` and later `10.0000`. |
| onBlur save | PASS | User entered `10`, moved focus away, and confirmed `actual_effort_mm=10.0000` in Supabase. |
| Enter save | SKIP | Enter trigger was not separately confirmed. |
| Escape rollback | PASS | User manually confirmed Escape rollback in the browser; SQL value remained at the saved state. |
| Empty draft to `0` | PASS | Supabase row showed `actual_effort_mm=0.0000` for the empty draft to zero smoke. |
| Refresh | PASS | User manually confirmed refresh preserved the saved actual effort value and reflected summary actual/gap values. |
| Actual effort audit | PASS | `standard_effort.actual_effort.update` success row was confirmed after smoke start with `metadata_json.unit="M/M"`. |

SQL evidence summary:

- Table: `public.estimation_project_solution_selection`.
- `project_id=7`.
- `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`.
- `enabled=true`.
- Manual WFM edit evidence:
  - `actual_effort_mm=20.0000`.
  - `updated_at=2026-05-25 10:00:37.430547+00`.
- Empty draft to zero evidence:
  - `actual_effort_mm=0.0000`.
  - `updated_at=2026-05-25 10:00:37.430547+00`.
- onBlur evidence:
  - Input value: `10`.
  - `actual_effort_mm=10.0000`.
  - `updated_at=2026-05-25 10:00:37.430547+00`.

Audit evidence summary:

- Table: `public.app_audit_logs`.
- `event_type=standard_effort.actual_effort.update`.
- `event_result=success`.
- `target_type=standard_effort`.
- `target_id=7:d3fd971f-505a-4829-b519-a379b40d034b`.
- `project_id=7`.
- `metadata_json.unit=M/M`.
- `created_at=2026-06-08 08:38:07.56783+00`.

Observation:

- `actual_effort_mm` changed in the captured rows, but `updated_at` did not
  change. This is recorded as a follow-up observation and is not treated as a
  smoke failure because value persistence and audit evidence were confirmed.

## 6-C. Phase 10-A-Fix-1 `updated_at` Repository Fix

Result: FIX IMPLEMENTED. UPDATED_AT RE-SMOKE WAIVED/DEFERRED.

Scope:

- Supabase Standard Effort solution selection write path.
- Supabase Standard Effort item selection write path.
- Supabase Standard Effort actual effort write path.

Implementation summary:

- Each write function creates one `new Date().toISOString()` value at call time.
- Batch upsert rows in the same function call receive the same `updated_at`
  value.
- Actual effort update and insert fallback payloads include `updated_at`.
- Existing persisted business fields remain unchanged:
  - `project_id`
  - `solution_variant_id`
  - `item_id`
  - `enabled`
  - `checked`
  - `actual_effort_mm`
- `actual_effort_md` was not reintroduced.
- No M/D to M/M numeric conversion was added.

Required re-smoke checks:

| Check | Status |
|---|---|
| `actual_effort_mm` onBlur save updates `updated_at` | WAIVED/DEFERRED |
| Solution toggle save updates `updated_at` | WAIVED/DEFERRED |
| Item checkbox save updates `updated_at` | WAIVED/DEFERRED |

Do not promote these timestamp checks to PASS or FAIL from this close-out. Keep
updated_at as a deferred observation unless a future focused phase captures new
Supabase SQL evidence.

Reason:

- `actual_effort_mm` save, item checkbox save, solution save, refresh, and
  frontend audit evidence are confirmed.
- `updated_at` is a supporting tracking field, not the primary business value
  for this Supabase interim close.
- Phase 10-A-Fix-1 implemented explicit `updated_at` payload injection.
- A future focused phase can reopen the timestamp verification if needed.

## 6-D. Phase 10-A-R-3U-close Item Checkbox and R-4 Preparation

Result: CLOSE-OUT DOCUMENTED.

Item checkbox select/unselect evidence:

| Check | Result | Evidence |
|---|---|---|
| Item checkbox select/unselect path | PASS | User selected and then unselected the item checkbox in the browser. |
| Final SQL state | PASS | Supabase SQL confirmed the row for `project_id=7`, `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`, and `item_id=7d2973f1-ab47-40ec-a1b1-8f069d96f090`. |
| Final `checked` value | PASS | Final checked state was confirmed as `false`. |
| `updated_at` as PASS/FAIL evidence | WAIVED/DEFERRED | Not used as PASS/FAIL evidence in this close-out. |

Phase 10-A-R-4 candidate: Meta admin save/restore smoke.

Goal:

- Run Supabase mode Standard Effort meta admin save/restore smoke.
- Verify base effort save/restore.
- Verify coefficient save/restore.
- Verify variant active toggle save/restore.
- Verify item active toggle save/restore.
- Confirm `active=false` remains visible in admin and is excluded from the
  estimator surface.

Candidate IDs:

- `SOLUTION_VARIANT_ID=d3fd971f-505a-4829-b519-a379b40d034b`
- `ITEM_ID=7d2973f1-ab47-40ec-a1b1-8f069d96f090`

Candidate SQL:

```sql
select
  solution_variant_id,
  phase_code,
  phase_name,
  effort_mm,
  updated_at
from public.estimation_standard_base_effort_meta
where solution_variant_id = 'd3fd971f-505a-4829-b519-a379b40d034b'
order by display_order;

select
  item_id,
  solution_variant_id,
  coefficient,
  active,
  updated_at
from public.estimation_item_solution_coefficient_meta
where item_id = '7d2973f1-ab47-40ec-a1b1-8f069d96f090'
order by solution_variant_id;

select
  solution_variant_id,
  display_name,
  active,
  updated_at
from public.estimation_solution_variant
where solution_variant_id = 'd3fd971f-505a-4829-b519-a379b40d034b';

select
  item_id,
  item_name,
  item_option,
  active,
  updated_at
from public.estimation_standard_item_meta
where item_id = '7d2973f1-ab47-40ec-a1b1-8f069d96f090';
```

R-4 cautions:

- Restore meta values after each smoke edit.
- Keep `effort_mm` as the base effort unit.
- Keep coefficient values unitless.
- Do not add M/D to M/M conversion.
- Restore active toggles because they affect estimator visibility.

## 6-E. Phase 10-A-R-4 Manual Meta Admin Save/Restore Smoke

Result: PASS.

Smoke timestamp:

- `SMOKE_STARTED_AT=2026-06-10 01:34:38.670303+00`

Smoke IDs:

- `PROJECT_ID=7`
- `SOLUTION_VARIANT_ID=d3fd971f-505a-4829-b519-a379b40d034b`
- `SOLUTION_DISPLAY_NAME=WFM`
- `ITEM_ID=7d2973f1-ab47-40ec-a1b1-8f069d96f090`
- `ITEM_NAME=중계서버(HostClient기반)`

Manual browser and SQL result:

| Check | Result | Evidence |
|---|---|---|
| Meta admin load | PASS | Meta admin page was accessible; base effort grid, coefficient grid, and variant/item active state lookup were confirmed. |
| Base effort save/restore | PASS | WFM `analysis` `effort_mm` changed from `1.5` to `2`, then restored to `1.5`; both states were confirmed by Supabase SQL. |
| Coefficient save/restore | PASS | The WFM coefficient for the selected item changed from `0` to `1`, then restored to `0`; both states were confirmed by Supabase SQL. |
| Variant active toggle save/restore | PASS | WFM variant active changed from `true` to `false`, then restored to `true`; both states were confirmed by Supabase SQL. Estimator exclusion was confirmed as `YES`. |
| Item active toggle save/restore | PASS | Selected item active changed from `true` to `false`, then restored to `true`; both states were confirmed by Supabase SQL. Estimator exclusion was confirmed as `YES`. |
| Meta admin audit | PASS | `standard_effort_meta.base_effort.update`, `standard_effort_meta.coefficient.update`, and `standard_effort_meta.active.update` success events were confirmed after `SMOKE_STARTED_AT`. |

SQL evidence summary:

- Base effort:
  - `phase_code=analysis`
  - `original_effort_mm=1.5`
  - `changed_effort_mm=2`
  - `restored_effort_mm=1.5`
  - `updated_at_after_change=2026-06-10 01:38:14.657+00`
  - `updated_at_after_restore=2026-06-10 01:38:41.677+00`
- Coefficient:
  - `original_coefficient=0`
  - `changed_coefficient=1`
  - `restored_coefficient=0`
  - `updated_at_after_change=2026-06-10 01:40:50.572+00`
  - `updated_at_after_restore=2026-06-10 01:41:24.228+00`
- Variant active:
  - `original_active=true`
  - `changed_active=false`
  - `restored_active=true`
  - `updated_at_after_change=2026-06-10 01:43:33.587+00`
  - `updated_at_after_restore=2026-06-10 01:44:02.366+00`
- Item active:
  - `original_active=true`
  - `changed_active=false`
  - `restored_active=true`
  - `updated_at_after_change=2026-06-10 01:46:00.429+00`
  - `updated_at_after_restore=2026-06-10 01:46:45.657+00`

Notes:

- `effort_mm` remained the base effort unit.
- `effort_md` was not used.
- Coefficient values remained unitless.
- `effort_mm` and `actual_effort_mm` were not touched by the coefficient path.
- No M/D to M/M conversion was reported.
- Edited values were restored.
- Standard export implementation is now connected; browser/file smoke remains
  pending.
- API DB smoke remains deferred.
- `updated_at` re-smoke remains WAIVED/DEFERRED unless explicitly reopened.

## 6-F. Phase 10-B-4 Supabase Standard Effort Export Browser/File Smoke

Result: PASS, with network fallback capture PARTIAL.

Smoke target:

- `PROJECT_ID=7`
- `SOLUTION_VARIANT_ID=d3fd971f-505a-4829-b519-a379b40d034b`
- `SOLUTION_DISPLAY_NAME=WFM`
- `ITEM_ID=7d2973f1-ab47-40ec-a1b1-8f069d96f090`

Execution:

- Local Vite dev server: `http://127.0.0.1:5173`
- Browser: Chrome headless through DevTools Protocol
- Data backend: `VITE_DATA_BACKEND=supabase`
- Standard effort mode: `VITE_STANDARD_EFFORT_MODE=standard`
- Auth permission mode: `VITE_AUTH_PERMISSION_MODE=disabled`
- Supabase URL/key values were not printed or recorded.

Browser result:

| Check | Result | Evidence |
|---|---|---|
| Project list/select | PASS | Initial load showed zero projects, then browser refresh loaded 5 projects; `PROJECT_ID=7` was selected as `테스트 (ID: 7, 수정일: 2026. 06. 08.)`. |
| Standard mode screen | PASS | Standard Effort section loaded with WFM visible and 6 selected solutions. |
| Header Excel button | PASS | Button text was `Excel 다운로드`, enabled, and clicked. |
| Unsupported API-only message | PASS | `unsupportedBeforeClick=false`; the old API-only export message was not shown. |
| Downloaded file | PASS | `.xlsx` file was downloaded. |

Downloaded workbook:

| Field | Result |
|---|---|
| Filename | `표준공수_standard_effort_20260610.xlsx` |
| Extension | `.xlsx` |
| Workbook opened | YES, parsed with `xlsx` |
| Sheet names | `요약`, `솔루션별 공수`, `체크 항목` |
| Sheet row counts | `요약=8`, `솔루션별 공수=6`, `체크 항목=18` |

Summary sheet verification:

| Check | Result | Evidence |
|---|---|---|
| Project ID | PASS | `프로젝트 ID=7` |
| Generated timestamp | PASS | `생성일시=2026-06-10T10:31:49.940Z` |
| Solution count | PASS | `솔루션 수=6` |
| Base total | PASS | `기본공수합(M/M)=33.25` |
| Standard effort total | PASS | `표준공수합(M/M)=26.42` |
| Actual effort total | PASS | `실투입공수합(M/M)=38` |
| Gap total | PASS | `GAP(M/M)=-11.58` |
| M/M labels | PASS | Summary labels include `M/M`; no M/D label was found. |

Solution effort sheet verification:

| Check | Result | Evidence |
|---|---|---|
| Sheet | PASS | `솔루션별 공수` exists. |
| WFM row | PASS | WFM row exists. |
| WFM base total | PASS | `기본공수합(M/M)=8` |
| WFM coefficient total | PASS | `계수합=1.74`; coefficient remains unitless. |
| WFM standard effort | PASS | `표준공수(M/M)=13.92` |
| WFM actual effort | PASS | `실투입공수(M/M)=10` |
| WFM gap | PASS | `GAP(M/M)=3.92` |
| M/M labels | PASS | Effort columns use `M/M`; coefficient column does not use an M/M label. |

Checked item sheet verification:

| Check | Result | Evidence |
|---|---|---|
| Sheet | PASS | `체크 항목` exists. |
| Checked rows | PASS | 18 checked rows exported. |
| WFM checked rows | PASS | 6 WFM checked rows exported. |
| Check marker | PASS | Checked rows use `체크여부=Y`. |
| Coefficient | PASS | Coefficient values are numeric and unitless. |
| Selected smoke item | PASS | The specific `ITEM_ID=7d2973f1-ab47-40ec-a1b1-8f069d96f090` was not exported because the current Supabase smoke state for that item is `checked=false`; this matches the checked-only export policy. |

Observed WFM checked rows:

- `화면개발`, coefficient `0`, `체크여부=Y`
- `CTI`, coefficient `0`, `체크여부=Y`
- `IVR`, coefficient `0.12`, `체크여부=Y`
- `녹취`, coefficient `0.12`, `체크여부=Y`
- `스케줄/근태`, coefficient `1`, `체크여부=Y`
- `인사/배치`, coefficient `0.5`, `체크여부=Y`

Fallback/network verification:

| Check | Result | Evidence |
|---|---|---|
| Legacy fallback used | NO | Downloaded workbook has Standard Effort sheets (`요약`, `솔루션별 공수`, `체크 항목`) rather than the legacy `Estimate` sheet. |
| API export-data called | PARTIAL | The successful download pass did not capture full network events. A separate instrumented retry before successful project selection observed `api_export_data_called=false`, but it did not reach the export click. |
| Supabase local export path used | YES, inferred | Runtime was `VITE_DATA_BACKEND=supabase`, project data loaded from Supabase, and the standard workbook was produced from the Header Excel action. |
| Supabase requests | PARTIAL | Separate network instrumentation observed Supabase requests, but that run did not complete export click. |

Limit status:

- Previous state: `FIX IMPLEMENTED / SMOKE PENDING`.
- New state: `PASS`; the standard+supabase export limitation is resolved for
  browser download and workbook content smoke.
- Remaining caveat: direct successful-pass network fallback capture is partial.

## 7. Supabase Prerequisite SQL

Result: PARTIAL.

Evidence:

- Standard effort selection and item selection tables were queried for
  `project_id=7`.
- Standard effort base effort and coefficient meta rows were queried for the
  selected variant/item IDs.
- Audit table rows were queried for `project_id=7`.
- Full schema/table count prerequisite SQL was not separately reported in this
  smoke result.

Recommended full prerequisite checks remain:

```sql
select count(*) from public.estimation_solution;
select count(*) from public.estimation_solution_variant;
select count(*) from public.estimation_standard_base_effort_meta;
select count(*) from public.estimation_standard_item_meta;
select count(*) from public.estimation_item_solution_coefficient_meta;
select count(*) from public.estimation_project_solution_selection;
select count(*) from public.estimation_project_item_solution_selection;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'estimation_standard_base_effort_meta',
    'estimation_project_solution_selection'
  )
  and column_name in ('effort_mm', 'actual_effort_mm');
```

## 8. Project List/Select Smoke

Result: PASS.

Evidence:

- Supabase selection/write rows use `project_id=7`.
- Browser smoke was performed against `project_id=7`.
- A separate project name capture was not provided in a reliably decoded form.

Follow-up:

- In a future manual smoke pass, record the project display name exactly as
  shown in the browser.

## 9. Standard Effort Section Load Smoke

Result: PASS.

| Field | Result |
|---|---|
| `standard_effort_mm` visible | PASS |
| `actual_effort_mm` visible | PASS |
| `gap_mm` visible | PASS |

Evidence:

- Standard effort selection, item selection, and `actual_effort_mm` save rows
  were confirmed in Supabase for `project_id=7`.
- Solution selection, item selection, and actual effort write paths were
  exercised.
- Audit rows were confirmed for Standard Effort write actions.
- A direct full-section screenshot was not provided, so this PASS is based on
  the successful load/save path evidence rather than a visual screenshot.

## 10. Solution Toggle Save Smoke

Result: PASS.

SQL summary:

- Table: `public.estimation_project_solution_selection`.
- Query: `project_id=7`.
- Latest row:
  - `project_id=7`
  - `solution_variant_id=b53c9110-4e9b-447f-8f26-b75aa7a7dab1`
  - `enabled=true`
  - `actual_effort_mm=0.0000`
  - `updated_at=2026-06-08 04:26:26.44633+00`
- Additional rows exist for `project_id=7`, including:
  - `c7e43feb-cb3c-4a39-92e7-79f57c525336`, `enabled=true`, `actual_effort_mm=0.0000`
  - `8e005397-e8c7-41a9-996f-347be24bd5ec`, `enabled=false`, `actual_effort_mm=0.0000`
  - `ece73d9e-0c2d-437b-8e9f-a73803ada942`, `enabled=true`, `actual_effort_mm=0.0000`
  - `d3fd971f-505a-4829-b519-a379b40d034b`, `enabled=true`, `actual_effort_mm=0.0000`
  - `52fd9197-76d0-4660-8a8b-c114e5c08de9`, `actual_effort_mm=3.0000`
  - `d38a4765-552a-4aa6-b657-5a2c3bc908ed`, `actual_effort_mm=9.0000`

Evidence:

- Solution selection rows exist and the latest `updated_at` is
  `2026-06-08 04:26:26+00`.
- `app_audit_logs` contains `standard_effort.solution.toggle` success rows for
  `project_id=7`.
- `actual_effort_mm` is present; no `actual_effort_md` usage was reported.

## 11. Item Checkbox Save Smoke

Result: PASS.

SQL summary:

- Table: `public.estimation_project_item_solution_selection`.
- Query: `project_id=7`.
- Latest row:
  - `project_id=7`
  - `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`
  - `item_id=7d2973f1-ab47-40ec-a1b1-8f069d96f090`
  - `checked=false`
  - `updated_at=2026-06-08 04:28:21.365115+00`
- Additional recent rows:
  - `solution_variant_id=b53c9110-4e9b-447f-8f26-b75aa7a7dab1`,
    `item_id=c9941e0b-5163-4f41-b70c-9a10777d222d`,
    `checked=true`, `updated_at=2026-06-08 04:26:34.476375+00`
  - `solution_variant_id=b53c9110-4e9b-447f-8f26-b75aa7a7dab1`,
    `item_id=ffcd0c35-4c8f-4040-9942-0ec1f7e9fb5c`,
    `checked=true`, `updated_at=2026-06-08 04:26:30.21168+00`

Evidence:

- Item checkbox true/false rows are persisted.
- `app_audit_logs` contains `standard_effort.item.check` success rows for
  `project_id=7`.

## 12. Actual Effort Save Smoke

Result: PASS.

| Interaction | Result |
|---|---|
| General save | PASS |
| onBlur | PASS |
| Enter | SKIP |
| Escape | PASS |
| Empty draft to `0` | PASS |

SQL summary:

- Table: `public.estimation_project_solution_selection`.
- Query: `project_id=7` and
  `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`.
- General save values confirmed in Supabase:
  - `actual_effort_mm=20.0000` after manual WFM edit.
  - `actual_effort_mm=10.0000` after onBlur edit.
- Empty draft to zero confirmed in Supabase:
  - `actual_effort_mm=0.0000`.
- `enabled=true`.
- Captured `updated_at=2026-05-25 10:00:37.430547+00`.
- `app_audit_logs` includes:
  - `event_type=standard_effort.actual_effort.update`
  - `event_result=success`
  - `target_type=standard_effort`
  - `target_id=7:d3fd971f-505a-4829-b519-a379b40d034b`
  - `metadata_json` includes `unit="M/M"`
  - `created_at=2026-06-08 08:38:07.56783+00`

Evidence:

- `actual_effort_mm` column exists and values are persisted.
- onBlur-specific evidence is available: user entered `10`, moved focus away,
  and confirmed `actual_effort_mm=10.0000`.
- Escape rollback was manually confirmed by the user. Typed and reverted
  numeric screen values were not separately captured, but SQL remained at the
  saved state.
- Empty draft to zero was confirmed with `actual_effort_mm=0.0000`.
- Enter-specific behavior was not separately confirmed and remains SKIP.
- Actual effort audit event exists after the smoke start timestamp.
- `updated_at` did not change in the captured rows. Treat this as follow-up
  observation, not as smoke failure.
- No M/D to M/M conversion was reported.
- No `actual_effort_md` usage was reported.

## 13. Refresh Smoke

Result: PASS.

Evidence:

- Stored solution/item/actual rows are present in Supabase.
- User manually confirmed refresh behavior in the browser.
- Refresh preserved the saved `actual_effort_mm` value.
- Summary `actual_effort_mm` was manually confirmed as reflected.
- `gap_mm` was manually confirmed as reflected.

Follow-up:

- If needed, add a numeric screenshot in a future smoke pass for exact
  summary/gap values after refresh.

## 14. Meta Admin Load Smoke

Result: PASS.

Evidence:

- Phase 10-A-R-4 manual browser smoke confirmed the Standard Effort meta admin
  page was accessible.
- Base effort grid loaded.
- Coefficient grid loaded.
- Variant/item active state lookup was available.
- Base effort meta rows for
  `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b` were queried.
- Coefficient meta rows for
  `item_id=7d2973f1-ab47-40ec-a1b1-8f069d96f090` were queried.
- Variant active and item active rows were queried.

## 15. Base Effort Save/Restore Smoke

Result: PASS.

SQL summary:

- Table: `public.estimation_standard_base_effort_meta`.
- `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`.
- Smoke row:
  - `phase_code=analysis`
  - `original_effort_mm=1.5`
  - `changed_effort_mm=2`
  - `restored_effort_mm=1.5`
  - `updated_at_after_change=2026-06-10 01:38:14.657+00`
  - `updated_at_after_restore=2026-06-10 01:38:41.677+00`

Evidence:

- WFM variant `analysis` `effort_mm` was edited from original to changed value
  and saved.
- Supabase SQL confirmed the changed `effort_mm` value.
- The value was restored to the original value and saved.
- Supabase SQL confirmed `restored_effort_mm=1.5`.
- `effort_mm` was used.
- `effort_md` was not used.
- No M/D to M/M conversion was reported.

## 16. Coefficient Save/Restore Smoke

Result: PASS.

SQL summary:

- Table: `public.estimation_item_solution_coefficient_meta`.
- `item_id=7d2973f1-ab47-40ec-a1b1-8f069d96f090`.
- `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`.
- Smoke row:
  - `original_coefficient=0`
  - `changed_coefficient=1`
  - `restored_coefficient=0`
  - `updated_at_after_change=2026-06-10 01:40:50.572+00`
  - `updated_at_after_restore=2026-06-10 01:41:24.228+00`

Evidence:

- The WFM coefficient for the selected item was edited from original to changed
  value and saved.
- Supabase SQL confirmed the changed coefficient value.
- The value was restored to the original value and saved.
- Supabase SQL confirmed `restored_coefficient=0`.
- Coefficient is unitless.
- `effort_mm` and `actual_effort_mm` were not touched by this path.

## 17. Active Toggle Save/Restore Smoke

Result: PASS.

Visibility/exclusion:

- Variant estimator exclusion after `active=false`: YES.
- Item estimator exclusion after `active=false`: YES.
- Admin active state lookup was available from the meta admin page.

SQL summary:

- Solution variant:
  - `solution_variant_id=d3fd971f-505a-4829-b519-a379b40d034b`
  - `display_name=WFM`
  - `original_active=true`
  - `changed_active=false`
  - `restored_active=true`
  - `updated_at_after_change=2026-06-10 01:43:33.587+00`
  - `updated_at_after_restore=2026-06-10 01:44:02.366+00`
- Item:
  - `item_id=7d2973f1-ab47-40ec-a1b1-8f069d96f090`
  - `original_active=true`
  - `changed_active=false`
  - `restored_active=true`
  - `updated_at_after_change=2026-06-10 01:46:00.429+00`
  - `updated_at_after_restore=2026-06-10 01:46:45.657+00`

Evidence:

- WFM variant active state was toggled from original to changed value and
  saved.
- Supabase SQL confirmed `changed_active=false`.
- The variant was restored to `active=true`.
- Supabase SQL confirmed `restored_active=true`.
- Selected item active state was toggled from original to changed value and
  saved.
- Supabase SQL confirmed `changed_active=false`.
- The item was restored to `active=true`.
- Supabase SQL confirmed `restored_active=true`.
- Estimator exclusion was confirmed for both variant and item after
  `active=false`.

## 18. Frontend Audit Smoke

Result: PASS.

SQL summary:

- Table: `public.app_audit_logs`.
- Query: `project_id=7`.
- Recent events include:
  - `standard_effort.item.check`, `success`, `target_type=standard_effort`
  - `standard_effort.actual_effort.update`, `success`, `target_type=standard_effort`
  - `standard_effort.solution.toggle`, `success`, `target_type=standard_effort`
- `metadata_json` includes section values and actual effort `unit="M/M"` for
  the actual effort event.
- Phase 10-A-R-3M actual effort audit evidence:
  - `event_type=standard_effort.actual_effort.update`
  - `event_result=success`
  - `target_type=standard_effort`
  - `target_id=7:d3fd971f-505a-4829-b519-a379b40d034b`
  - `project_id=7`
  - `metadata_json.unit=M/M`
  - `created_at=2026-06-08 08:38:07.56783+00`
- Phase 10-A-R-4 meta admin audit evidence after
  `SMOKE_STARTED_AT=2026-06-10 01:34:38.670303+00`:
  - `standard_effort_meta.base_effort.update`: PASS
  - `standard_effort_meta.coefficient.update`: PASS
  - `standard_effort_meta.active.update`: PASS
  - `event_result=success` confirmed

Evidence:

- `app_audit_logs` has Standard Effort write events for `project_id=7`.
- `app_audit_logs` has Standard Effort meta admin write events after the
  Phase 10-A-R-4 smoke start timestamp.
- This is frontend audit in Supabase mode and is not authoritative production
  audit.
- API mode production audit remains backend authoritative.

## 19. Standard Export Browser Smoke

Result: PASS.

Message/behavior:

- Phase 10-B-3 connects standard mode plus `VITE_DATA_BACKEND=supabase` to the
  local Standard Effort export workflow through `useExportManager`.
- Standard mode plus API backend keeps the existing API export workflow.
- Legacy/parallel mode frontend-local export remains separate.
- Supabase standard export must not fall back to legacy export or the API
  export workflow.
- Frontend export audit remains unconnected; production export audit remains
  Tomcat/backend authoritative.
- Phase 10-B-4 confirmed actual `.xlsx` download and workbook contents in
  Supabase mode.
- Successful-pass network fallback capture remains partial, but workbook shape
  and runtime mode confirm the Standard Effort Supabase export path rather than
  legacy workbook output.

Evidence summary:

- Filename: `표준공수_standard_effort_20260610.xlsx`
- Sheets: `요약`, `솔루션별 공수`, `체크 항목`
- Summary totals: `standard_effort_mm=26.42`,
  `actual_effort_mm=38`, `gap_mm=-11.58`
- WFM row: `standard_effort_mm=13.92`,
  `actual_effort_mm=10`, `gap_mm=3.92`
- Checked item sheet: 18 checked rows, including 6 WFM checked rows.
- No M/D label was found.

## 20. Findings / Issues

| Item | Result | Cause | Follow-up |
|---|---|---|---|
| Supabase env key presence | PASS | Required frontend keys are present; secrets masked | None |
| Automated frontend preflight | PASS after rerun | Initial test timeout/failure was observed; targeted UI rerun, full test rerun, and build passed | None |
| Project list/select | PASS | User browser smoke performed against `project_id=7` | Record exact project name in next pass |
| Standard Effort load | PASS | Load/save/audit paths verified through Supabase rows | Add screenshot evidence in next pass |
| Solution toggle save | PASS | Selection row and audit event confirmed | None |
| Item checkbox save | PASS | Item selection row and audit event confirmed | None |
| Actual effort save | PASS | General save, onBlur, Escape, empty draft to zero, SQL value, and audit confirmed | Enter-specific check remains separate SKIP |
| Enter-specific actual effort save | SKIP | Enter trigger was not separately confirmed | Re-run Enter-only browser check if required |
| Refresh | PASS | User manually confirmed saved value preservation and summary/gap reflection | Add numeric screenshot if needed |
| Phase 10-A-R-3 headless follow-up | SKIP | Read-only selection/input discovery worked, but write automation was unstable | Re-run manually or with a stable browser automation tool |
| `updated_at` on Standard Effort write rows | WAIVED/DEFERRED | Fix implemented, but timestamp PASS/FAIL re-smoke is not blocking for this Supabase interim close | Reopen in a focused timestamp smoke phase if needed |
| Meta admin load | PASS | Meta admin page, base effort grid, coefficient grid, and active state lookup confirmed | None |
| Base effort save/restore | PASS | WFM `analysis` `effort_mm` changed from `1.5` to `2` and restored to `1.5` with SQL evidence | None |
| Coefficient save/restore | PASS | WFM coefficient changed from `0` to `1` and restored to `0` with SQL evidence | None |
| Active toggle save/restore | PASS | Variant and item active states changed from `true` to `false` and restored to `true` with SQL evidence; estimator exclusion confirmed | None |
| Frontend audit | PASS | `app_audit_logs` rows confirmed for standard effort and meta admin events | None |
| Standard export in Supabase mode | PASS | Phase 10-B-4 downloaded and parsed the Standard Effort `.xlsx` workbook in Supabase mode; direct successful-pass network fallback capture is partial | Optional manual visual download smoke if desired |
| Tomcat API DB smoke | DEFERRED | Internal DB not ready | Reopen when DB prerequisites are ready |

## 21. Sign-Off Checklist

| Check | Status |
|---|---|
| Frontend test/build OK | PASS after rerun |
| Project list/select OK | PASS |
| Standard Effort load OK | PASS |
| Solution toggle save OK | PASS |
| Item checkbox save OK | PASS |
| `actual_effort_mm` save OK | PASS |
| Enter-specific actual effort save OK | SKIP |
| Refresh OK | PASS |
| Meta admin load OK | PASS |
| Base effort save OK | PASS |
| Coefficient save OK | PASS |
| Active toggle OK | PASS |
| Meta admin audit OK | PASS |
| No M/D conversion | PASS by reported field usage; no conversion reported |
| `effort_mm` confirmed | PASS |
| `actual_effort_mm` confirmed | PASS |
| Standard export browser smoke OK | PASS |
| API DB smoke deferred accepted | DOCUMENTED |
| Updated_at re-smoke closure accepted | WAIVED/DEFERRED |

Overall sign-off: PARTIAL with gate PASS after rerun. Key Supabase Standard
Effort calculation save paths, actual effort
general/onBlur/Escape/empty-to-zero behavior, refresh, meta admin save/restore
paths, frontend audit, and Supabase Standard Effort Excel export passed. The
Phase 10-A-R-4 test/build gate is PASS after targeted/full test reruns and
build rerun. Updated_at timestamp re-smoke is waived/deferred as a non-blocking
observation. Enter-specific actual effort save remains the only Standard Effort
interaction-specific SKIP in the interim smoke table.

## 22. Follow-Up Candidates

- Re-run Enter-specific actual effort browser smoke if Enter behavior requires
  separate manual evidence.
- Reopen Supabase Standard Effort `updated_at` verification in a separate
  focused phase if timestamp evidence becomes required.
- Phase 10-A-R-4 follow-up is complete. Preserve the restored meta values when
  running future smoke.
- Add screenshot/manual evidence fields for Standard Effort section load.
- Optional: run a manual visual Excel download smoke if a screenshot-based
  artifact is needed; automated browser/file smoke already passed.
- Reopen Tomcat API DB smoke after internal DB readiness.
