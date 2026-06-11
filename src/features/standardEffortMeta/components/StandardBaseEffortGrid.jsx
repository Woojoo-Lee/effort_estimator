import React, { useMemo } from "react";

const PHASES = [
  { code: "analysis", name: "분석", label: "분석(M/M)" },
  { code: "design", name: "설계", label: "설계(M/M)" },
  { code: "implementation", name: "구현", label: "구현(M/M)" },
  { code: "test", name: "단위/통합테스트", label: "단위/통합테스트(M/M)" },
  {
    code: "deployment",
    name: "이행 및 모니터링",
    label: "이행 및 모니터링(M/M)",
  },
];

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  });
}

function getVariantLabel(variant = {}) {
  return (
    variant.display_name ||
    [variant.solution_name, variant.variant_name].filter(Boolean).join(" ") ||
    "-"
  );
}

function sortByDisplayOrder(rows = []) {
  return [...rows].sort((a, b) => {
    const orderCompare = toNumber(a.display_order) - toNumber(b.display_order);

    if (orderCompare !== 0) {
      return orderCompare;
    }

    return getVariantLabel(a).localeCompare(getVariantLabel(b));
  });
}

function buildBaseEffortMap(baseEffortRows = []) {
  return new Map(
    baseEffortRows.map((row) => [
      `${row.solution_variant_id}:${row.phase_code}`,
      row.effort_mm ?? row.effort_md ?? 0,
    ])
  );
}

function readDraftValue({
  baseEffortMap,
  draftRow,
  solutionVariantId,
  phaseCode,
}) {
  if (draftRow && Object.prototype.hasOwnProperty.call(draftRow, phaseCode)) {
    return draftRow[phaseCode];
  }

  return String(baseEffortMap.get(`${solutionVariantId}:${phaseCode}`) ?? 0);
}

function validateDraftRow(draftRow = {}) {
  for (const phase of PHASES) {
    const value = draftRow[phase.code];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "기본공수는 숫자여야 합니다.";
    }

    if (numericValue < 0) {
      return "기본공수는 0 이상이어야 합니다.";
    }
  }

  return "";
}

export default function StandardBaseEffortGrid({
  solutionVariants = [],
  baseEffortRows = [],
  baseEffortDrafts = {},
  baseEffortDirtyMap = {},
  baseEffortSavingMap = {},
  baseEffortErrorMap = {},
  baseEffortSavedMap = {},
  variantActiveSavingMap = {},
  variantActiveErrorMap = {},
  variantActiveSavedMap = {},
  onChangeBaseEffortDraft,
  onResetBaseEffortDraft,
  onSaveBaseEffortRow,
  onToggleSolutionVariantActive,
  readOnlyBaseEffort = false,
  readOnlyActive = false,
}) {
  const variants = useMemo(
    () => sortByDisplayOrder(solutionVariants),
    [solutionVariants]
  );
  const baseEffortMap = useMemo(
    () => buildBaseEffortMap(baseEffortRows),
    [baseEffortRows]
  );

  if (variants.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
        표시할 표준공수 솔루션 variant가 없습니다.
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="표준공수 솔루션 기본공수">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">
          솔루션/기본공수
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          5단계 기본공수는 M/M 기준이며, solution variant row 단위로
          저장합니다.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-extrabold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-3">솔루션</th>
              <th className="px-3 py-3">버전</th>
              <th className="px-3 py-3">표시명</th>
              {PHASES.map((phase) => (
                <th key={phase.code} className="min-w-28 px-3 py-3 text-right">
                  {phase.label}
                </th>
              ))}
              <th className="px-3 py-3 text-right">기본공수합(M/M)</th>
              <th className="px-3 py-3 text-center">사용 여부</th>
              <th className="px-3 py-3 text-center">저장</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => {
              const variantId = variant.solution_variant_id;
              const label = getVariantLabel(variant);
              const draftRow = baseEffortDrafts[variantId] || {};
              const phaseValues = PHASES.map((phase) =>
                readDraftValue({
                  baseEffortMap,
                  draftRow,
                  solutionVariantId: variantId,
                  phaseCode: phase.code,
                })
              );
              const total = phaseValues.reduce(
                (sum, value) => sum + toNumber(value),
                0
              );
              const validationError = validateDraftRow(
                PHASES.reduce((result, phase, index) => {
                  result[phase.code] = phaseValues[index];
                  return result;
                }, {})
              );
              const dirty = baseEffortDirtyMap[variantId] === true;
              const saving = baseEffortSavingMap[variantId] === true;
              const saved = baseEffortSavedMap[variantId] === true;
              const activeSaving = variantActiveSavingMap[variantId] === true;
              const activeSaved = variantActiveSavedMap[variantId] === true;
              const rowError =
                validationError ||
                baseEffortErrorMap[variantId] ||
                variantActiveErrorMap[variantId];

              return (
                <React.Fragment key={variantId}>
                  <tr
                    className={`border-b border-slate-100 ${
                      variant.active === false
                        ? "bg-slate-50 text-slate-400"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {variant.solution_name || variant.solution_code || "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {variant.variant_name || variant.variant_code || "-"}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {label}
                      {dirty ? (
                        <span className="ml-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                          변경됨
                        </span>
                      ) : null}
                    </td>
                    {PHASES.map((phase, index) => (
                      <td key={phase.code} className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={phaseValues[index]}
                          aria-label={`${label} ${phase.label}`}
                          onChange={(event) => {
                            if (readOnlyBaseEffort) {
                              return;
                            }

                            onChangeBaseEffortDraft?.(
                              variantId,
                              phase.code,
                              event.target.value
                            );
                          }}
                          className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                          disabled={
                            readOnlyBaseEffort || saving || activeSaving
                          }
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right font-extrabold text-slate-900">
                      {formatNumber(total)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <label className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={variant.active !== false}
                          aria-label={`${label} 사용 여부`}
                          onChange={(event) => {
                            if (readOnlyActive) {
                              return;
                            }

                            onToggleSolutionVariantActive?.(
                              variantId,
                              event.target.checked
                            );
                          }}
                          disabled={readOnlyActive || saving || activeSaving}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span
                          className={`rounded-lg px-2 py-1 ${
                            variant.active === false
                              ? "bg-slate-100 text-slate-500"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {activeSaving
                            ? "저장 중..."
                            : activeSaved
                              ? "저장 완료"
                              : variant.active === false
                                ? "미사용"
                                : "사용"}
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-2">
                        {dirty ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (readOnlyBaseEffort) {
                                return;
                              }

                              onResetBaseEffortDraft?.(variantId);
                            }}
                            disabled={
                              readOnlyBaseEffort || saving || activeSaving
                            }
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            되돌리기
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (readOnlyBaseEffort) {
                              return;
                            }

                            onSaveBaseEffortRow?.(variantId);
                          }}
                          disabled={
                            readOnlyBaseEffort ||
                            !dirty ||
                            Boolean(validationError) ||
                            saving ||
                            activeSaving
                          }
                          className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                          {saving
                            ? "저장 중..."
                            : saved && !dirty
                              ? "저장 완료"
                              : "저장"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {rowError ? (
                    <tr className="border-b border-slate-100">
                      <td
                        colSpan={11}
                        className="bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                      >
                        {rowError}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
