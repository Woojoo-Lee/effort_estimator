# Supabase Standard Effort Export Design

## 1. Purpose

This document defines a possible local Standard Effort Excel export path for
`VITE_DATA_BACKEND=supabase`.

The current interim operating path keeps Standard Effort development and smoke
validation on Supabase while Tomcat API DB smoke is deferred. In this mode,
Standard Effort calculation, save, meta admin, and frontend audit paths are
largely smoke-validated, but Standard Effort Excel export remains a documented
limitation.

The goal of this design is to decide whether to remove that limitation for
June-end demo/report needs without changing the production target:

- Production API mode should continue to use Tomcat API export endpoints.
- Tomcat API/backend remains the authoritative permission and audit boundary.
- Supabase local export is an interim frontend feature only.
- No M/D to M/M conversion is allowed.
- `effort_mm`, `actual_effort_mm`, `standard_effort_mm`, and `gap_mm` remain
  M/M values.
- `coefficient` remains a unitless multiplier.

The initial Phase 10-B was design-only. Phase 10-B-1 adds only pure
export-data mapper helpers and tests. Phase 10-B-2 adds the read-only
Supabase workbook preparation workflow. It fetches Standard Effort input,
calculates results, builds export data, and builds workbook output, but it does
not connect browser download, Header, or `useExportManager`, so runtime export
behavior remains unchanged.

## 2. Current Export Paths

| Mode/backend | Current behavior |
|---|---|
| `legacy` mode | Existing frontend-local legacy XLSX export. |
| `parallel` mode | Existing frontend-local legacy XLSX export. |
| `standard` + `api` | API export-data fetch, workbook helper, browser download. |
| `standard` + `supabase` | Unsupported limitation; should not fall back to legacy export. |

Current standard API export flow:

1. `useExportManager.downloadExcel` detects standard mode.
2. `VITE_DATA_BACKEND=api` is required.
3. `downloadStandardEffortWorkbookExport(projectId)` is called.
4. `prepareStandardEffortWorkbookExport` fetches export-data through
   `exportRepository`.
5. `buildStandardEffortWorkbookOutput` creates sheets and workbook output.
6. `downloadWorkbookOutput` triggers browser download.

Existing reusable helpers:

- `standardEffortExportMapper`
- `standardEffortWorkbook`
- `browserDownload`
- `standardEffortExportWorkflow`
- `standardEffortExportDownload`

## 3. Target Export Path Options

### Option A: Export From Loaded Screen/Store State

Convert currently loaded Standard Effort state from the screen/store into the
existing export-data shape, then reuse the workbook helper.

Pros:

- Fastest implementation.
- Export matches what the user currently sees.
- Suitable for a constrained June-end demo if data freshness is acceptable.

Cons:

- Stale state risk.
- If the user exports before refresh, output can differ from current Supabase
  rows.
- More dependent on UI/store shape.
- Harder to reuse in non-UI contexts.

### Option B: Refetch Supabase Input Before Export

Before export, call the existing Standard Effort repository read path for the
selected project, calculate results in the frontend with `calculateStandardEffort`,
build the export-data shape, then reuse the workbook helper.

Pros:

- Better data freshness at export time.
- Less dependent on currently loaded screen state.
- Closer to the API export-data flow.
- Reuses existing repository, math, mapper, workbook, and download helpers.
- Keeps standard export result generation explicit and testable.

Cons:

- Slightly larger implementation scope.
- Must handle repository/read failures.
- Requires a valid `projectId`.
- Still frontend/Supabase only, not authoritative production export.

### Option C: Keep Supabase Standard Export Unsupported

Leave the current limitation in place.

Pros:

- No implementation risk.
- Current behavior and smoke scope remain unchanged.

Cons:

- Users cannot download Standard Effort Excel output in the active Supabase
  development path.
- June-end demo/report workflows may need manual screenshots or SQL extracts.
- Standard calculation and meta admin can be validated, but workbook output
  cannot be shared from Supabase mode.

## 4. Option Comparison

| Criterion | Option A: loaded state | Option B: refetch before export | Option C: unsupported |
|---|---|---|---|
| Implementation size | Small | Medium | None |
| Data freshness | Medium | High | N/A |
| UI/store dependency | High | Low | N/A |
| Requires refresh first | Recommended | No | N/A |
| Test size | Medium | Medium/high | Low |
| June-end suitability | Good if time is short | Best | Weak if Excel is needed |
| Existing API helper reuse | High | High | N/A |
| Long-term maintainability | Medium | High | Low feature value |

Recommendation:

- Prefer Option B for June-end completion if Standard Effort Excel output is
  required while Supabase remains the active backend.
- Keep Option A as a fallback only if schedule pressure is severe.
- Keep Option C only if the current export limitation is acceptable for the
  demo/report scope.

## 5. Supabase Local Export Data Shape

The local Supabase export should match the existing API export-data shape so
that `standardEffortWorkbook` and `standardEffortExportMapper` can be reused.

Recommended shape:

```json
{
  "project": {
    "id": 7,
    "project_id": 7,
    "project_name": "Project name"
  },
  "standard_effort": {
    "results": [
      {
        "solution_variant_id": "uuid",
        "solution_code": "string",
        "solution_name": "string",
        "variant_code": "string",
        "variant_name": "string",
        "display_name": "string",
        "base_total_mm": 0,
        "coefficient_total": 0,
        "standard_effort_mm": 0,
        "actual_effort_mm": 0,
        "gap_mm": 0
      }
    ],
    "totals": {
      "base_total_mm": 0,
      "coefficient_total": 0,
      "standard_effort_mm": 0,
      "actual_effort_mm": 0,
      "gap_mm": 0,
      "solution_count": 0
    }
  },
  "selections": {
    "projectSolutionSelections": [],
    "projectItemSelections": []
  },
  "checked_items": [],
  "generated_at": "2026-06-10T00:00:00.000Z",
  "generated_by": {}
}
```

Required numeric fields:

- `base_total_mm`
- `coefficient_total`
- `standard_effort_mm`
- `actual_effort_mm`
- `gap_mm`

Rules:

- Keep snake_case payload fields.
- Preserve `project_id` as number or numeric string; do not convert it to UUID.
- Do not emit `actual_effort_md`.
- Do not emit `effort_md`.
- Do not perform M/D to M/M conversion.
- Use `effort_mm` as source data for base effort rows.
- Treat missing numeric values as `0`.
- Treat `coefficient` as unitless.

## 6. Data Preparation Design

Recommended Option B workflow:

1. Require `projectId`.
2. Fetch fresh Standard Effort input:
   - `fetchStandardEffortInput(projectId)`
3. Calculate Standard Effort results:
   - `calculateStandardEffort(input)`
4. Build totals from calculated results.
5. Build checked item rows from input selections/meta.
6. Build export-data shape.
7. Build workbook output:
   - `buildStandardEffortWorkbookOutput(exportData, options)`
8. Download workbook:
   - `downloadWorkbookOutput(workbookOutput, options, deps)`

This keeps export read-only and avoids using stale UI state as the primary
source of truth.

## 7. Helper and Workflow Candidates

Candidate new file:

- `src/services/export/standardEffortSupabaseExportWorkflow.js`

Candidate functions:

- `prepareStandardEffortSupabaseWorkbookExport(projectId, options?, deps?)`
- `buildStandardEffortExportDataFromInput(input, project?)`
- `buildCheckedItemsFromStandardEffortInput(input)`
- `buildStandardEffortTotals(results)`

Reusable existing functions:

- `fetchStandardEffortInput(projectId)`
- `calculateStandardEffort(input)`
- `buildStandardEffortWorkbookOutput(exportData, options)`
- `downloadWorkbookOutput(workbookOutput, options, deps)`

Design notes:

- Do not replace the API export workflow.
- Keep API backend export and Supabase local export separate.
- Keep the Supabase export workflow read-only.
- Do not write frontend audit for export in this interim path.
- Return `{ data, error }` shape consistent with existing export workflows.

## 8. Project Information Handling

`projectId` is required.

Project name is optional:

- Prefer `projectState.projectName`, `projectState.currentProject.project_name`,
  or another already loaded project label if available.
- If only `projectId` is available, build a minimal project shape.
- Filename generation can reuse the existing
  `buildStandardEffortExportFilename` behavior through the workbook helper.

Missing `projectId` should return a clear error and show a user-facing export
failure toast.

## 9. `checked_items` Design

Inputs:

- `itemRows`
- `coefficientRows`
- `projectItemSelections`
- `solutionVariants`

Recommended generation:

1. Filter `projectItemSelections` to `checked=true`.
2. Join by `solution_variant_id` and `item_id`.
3. Add variant labels and item labels.
4. Add `coefficient` from matching coefficient row.
5. Emit only checked rows in `checked_items`.

Recommended row fields:

- `solution_variant_id`
- `solution_code`
- `solution_name`
- `variant_code`
- `variant_name`
- `display_name`
- `item_id`
- `category_l1`
- `category_l2`
- `item_name`
- `item_option`
- `coefficient`
- `checked`

The first implementation should include only checked rows. If a future workbook
requires unchecked rows, add that as an explicit option rather than changing
the default.

## 10. Totals Design

Build totals from `calculateStandardEffort` result rows:

- `base_total_mm`: sum of result `base_total_mm`
- `coefficient_total`: sum of result `coefficient_total`
- `standard_effort_mm`: sum of result `standard_effort_mm`
- `actual_effort_mm`: sum of result `actual_effort_mm`
- `gap_mm`: sum of result `gap_mm`
- `solution_count`: result row count

Rules:

- Missing numeric values fall back to `0`.
- Use existing M/M result fields directly.
- Do not convert units.
- Keep totals field names aligned with `standardEffortExportMapper`.

## 11. Header / `useExportManager` Integration

Current behavior:

- `standard + api` calls `downloadStandardEffortWorkbookExport`.
- `standard + supabase` shows an unsupported export notice.
- `legacy/parallel` keep existing legacy local export.

Future behavior candidate:

- `standard + api`: unchanged API export workflow.
- `standard + supabase`: call
  `downloadStandardEffortSupabaseWorkbookExport` or
  `prepareStandardEffortSupabaseWorkbookExport` plus `downloadWorkbookOutput`.
- `legacy/parallel`: unchanged legacy export.

Requirements:

- Keep existing Header `canExport` permission behavior.
- Keep `export.read` permission skeleton behavior.
- Do not fall back from Standard Effort Supabase export to legacy export.
- Do not fall back from API export to Supabase export.
- Show a clear error toast when `projectId` is missing.
- Replace the unsupported Supabase message only after the local export workflow
  is implemented and tested.

## 12. Permission and Audit Policy

Supabase local export is a frontend UX feature.

Policy:

- Frontend guards remain UX restrictions, not authoritative security.
- Supabase local export should not write frontend audit by default.
- Production API mode should rely on Tomcat backend authoritative
  `export.download` audit.
- Operating production exports should use `standard + api`, not Supabase local
  export.

This means Supabase local export is acceptable as an interim demo/report aid,
but not as the final operating control.

## 13. Error and UX Policy

Error cases:

- Missing `projectId`.
- Repository fetch failure.
- Empty or incomplete meta/selections.
- `calculateStandardEffort` failure.
- Workbook build failure.
- Browser download failure.

UX:

- Success toast: Standard Effort Excel export completed.
- Failure toast: Standard Effort Excel export failed.
- The current unsupported Supabase message should remain until implementation.
- Supabase mode must not call legacy export in standard mode.

## 14. Test Strategy

Pure tests:

- `buildStandardEffortExportDataFromInput`.
- `buildCheckedItemsFromStandardEffortInput`.
- `buildStandardEffortTotals`.
- `actual_effort_mm` retained.
- `gap_mm` retained.
- No M/D conversion.
- No `actual_effort_md` output.
- Coefficient remains unitless.

Workflow tests:

- Calls `fetchStandardEffortInput(projectId)`.
- Calls `calculateStandardEffort(input)`.
- Calls workbook output helper.
- Calls browser download helper.
- Missing `projectId` returns an error.
- Repository failure returns an error.
- Empty selections are handled.

`useExportManager` tests:

- `standard + supabase` calls local Supabase export workflow.
- `standard + api` still calls API export workflow.
- `legacy/parallel` remain unchanged.
- Export permission behavior remains unchanged.
- Missing project id shows an error.

Regression:

- Existing export tests pass.
- Existing Standard Effort tests pass.
- Full `npm.cmd run test:run` passes.
- `npm.cmd run build` passes.

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Stale screen state export | Prefer Option B refetch before export. |
| Supabase read failure | Return `{ data: null, error }` and show failure toast. |
| Missing project id | Validate before fetch and show clear error. |
| Missing M/M fields | Normalize numeric values to `0`; test required fields. |
| `checked_items` shape mismatch | Build pure mapper tests against workbook mapper expectations. |
| API export and local export drift | Reuse the same export-data shape and workbook helper. |
| No authoritative export audit | Document Supabase export as interim only; keep API audit as production target. |
| Large workbook memory usage | Keep initial workbook focused on summary/results/checked items. |
| Header permission collision | Do not change existing `canExport` semantics. |
| Standard mode accidentally uses legacy export | Add regression test for no legacy fallback. |
| `actual_effort_md` reappears | Strip/avoid legacy effort fields; add tests. |

## 16. Implementation Order Proposal

### Phase 10-B-1: Pure Export Data Mapper

Scope:

- Add pure helpers for export-data construction from Standard Effort input.
- Add `checked_items` and totals helpers.
- Add unit tests.

Status: implemented.

Implemented helper file:

- `src/utils/export/standardEffortSupabaseExportMapper.js`

Implemented helper functions:

- `toExportNumber`
- `toExportBoolean`
- `normalizeExportResult`
- `buildStandardEffortTotals`
- `buildCheckedItemsFromStandardEffortInput`
- `buildStandardEffortExportDataFromInput`

No UI integration, repository fetch, workbook creation, browser download, or
export behavior change is included in Phase 10-B-1.

### Phase 10-B-2: Supabase Export Workflow

Scope:

- Add Supabase export workflow.
- Fetch `fetchStandardEffortInput(projectId)`.
- Run `calculateStandardEffort(input)`.
- Build workbook output.
- Add workflow tests.

Status: implemented.

Implemented workflow file:

- `src/services/export/standardEffortSupabaseExportWorkflow.js`

Implemented workflow functions:

- `prepareStandardEffortSupabaseWorkbookExport`
- `buildStandardEffortSupabaseWorkbookFromInput`

The workflow returns `{ data, error }` from the prepare function and supports
dependency injection for repository fetch, calculation, export-data mapping,
and workbook output building. It does not import browser download helpers, DOM
APIs, `xlsx`, API adapters, or audit helpers. No Header integration yet.

### Phase 10-B-3: `useExportManager` Integration

Scope:

- Enable `standard + supabase` export path.
- Keep `standard + api` unchanged.
- Keep `legacy/parallel` unchanged.
- Update tests for backend/mode routing.

Status: implemented.

Implemented download helper file:

- `src/services/export/standardEffortSupabaseExportDownload.js`

Implemented download helper functions:

- `downloadStandardEffortSupabaseWorkbookExport`
- `downloadPreparedStandardEffortSupabaseWorkbookOutput`

The `useExportManager.downloadExcel` branch now routes:

- `legacy`: existing frontend-local legacy Excel export.
- `parallel`: existing frontend-local legacy Excel export.
- `standard + api`: existing API Standard Effort export workflow.
- `standard + supabase`: Supabase local Standard Effort export workflow.

The Header action shape is unchanged; Header still calls
`actions.downloadExcel`. Standard Supabase export does not fall back to legacy
export and does not fall back to the API export workflow. Frontend export audit
is still not connected.

### Phase 10-B-4: Browser Smoke

Scope:

- Run Supabase mode browser export smoke.
- Confirm `.xlsx` file download.
- Confirm workbook sheets.
- Confirm summary/results/checked item values.
- Confirm M/M fields.
- Confirm no M/D conversion.
- Confirm filename.

Status: passed.

Phase 10-B-4 confirmed a Supabase mode Header Excel download, the generated
`.xlsx` filename, workbook sheets, summary totals, WFM result values, checked
item rows, M/M labels, and absence of M/D labels. Successful-pass network
fallback capture remains partial, but the downloaded workbook is the Standard
Effort workbook, not the legacy `Estimate` workbook.

## 17. June-End Decision

If June-end demo/report needs require a Standard Effort workbook while
`VITE_DATA_BACKEND=supabase` remains active, implement Option B.

If schedule risk is too high, keep the current limitation and rely on the
already validated Standard Effort calculation/save/meta admin paths.

The implementation decision should be made after this design phase.
