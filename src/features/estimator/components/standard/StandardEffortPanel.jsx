import React, { useMemo } from "react";

import StandardEffortCheckTable from "./StandardEffortCheckTable";
import StandardEffortSummary from "./StandardEffortSummary";
import StandardSolutionVariantSelector from "./StandardSolutionVariantSelector";

function getVariantLabel(variant = {}) {
  if (variant.display_name) {
    return variant.display_name;
  }

  return [variant.solution_name, variant.variant_name]
    .filter(Boolean)
    .join(" ");
}

function sortByDisplayOrder(rows = []) {
  return [...rows].sort((a, b) => {
    const orderCompare =
      Number(a.display_order || 0) - Number(b.display_order || 0);

    if (orderCompare !== 0) {
      return orderCompare;
    }

    return getVariantLabel(a).localeCompare(getVariantLabel(b));
  });
}

function getEnabledVariantIds(projectSolutionSelections = []) {
  return new Set(
    projectSolutionSelections
      .filter((selection) => selection.enabled === true)
      .map((selection) => selection.solution_variant_id)
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
      {children}
    </div>
  );
}

function Notice({ tone = "neutral", children }) {
  const toneClass =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-semibold ${toneClass}`}
    >
      {children}
    </div>
  );
}

function SaveStatusBadge({ saveStatus = {} }) {
  if (!saveStatus.status || saveStatus.status === "idle") {
    return null;
  }

  const isFailed = saveStatus.status === "failed";
  const className = isFailed
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-extrabold ${className}`}
    >
      {isFailed ? "저장 실패" : saveStatus.message}
    </span>
  );
}

function RefreshStatusBadge({ refreshStatus = {} }) {
  if (!refreshStatus.status || refreshStatus.status === "idle") {
    return null;
  }

  const isFailed = refreshStatus.status === "failed";
  const className = isFailed
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-extrabold ${className}`}
    >
      {isFailed ? "새로고침 실패" : refreshStatus.message}
    </span>
  );
}

export default function StandardEffortPanel({
  solutionVariants = [],
  itemRows = [],
  projectSolutionSelections = [],
  projectItemSelections = [],
  results = [],
  totals,
  loading = false,
  error = "",
  saveStatus = { status: "idle", message: "" },
  refreshStatus = { status: "idle", message: "" },
  refreshDisabled = false,
  onRefresh,
  onToggleSolution,
  onToggleItem,
  onChangeActualEffort,
  readOnly = false,
  solutionSelectionReadOnly = readOnly,
  itemSelectionReadOnly = readOnly,
  actualEffortReadOnly = readOnly,
}) {
  const sortedVariants = useMemo(
    () => sortByDisplayOrder(solutionVariants),
    [solutionVariants]
  );
  const selectedSolutionVariants = useMemo(() => {
    const enabledVariantIds = getEnabledVariantIds(projectSolutionSelections);

    return sortedVariants.filter((variant) =>
      enabledVariantIds.has(variant.solution_variant_id)
    );
  }, [projectSolutionSelections, sortedVariants]);
  const hasSolutionVariants = sortedVariants.length > 0;
  const solutionControlsDisabled =
    solutionSelectionReadOnly || loading || saveStatus.status === "saving";
  const itemControlsDisabled =
    itemSelectionReadOnly || loading || saveStatus.status === "saving";
  const actualEffortControlsDisabled =
    actualEffortReadOnly || loading || saveStatus.status === "saving";
  const isRefreshDisabled =
    refreshDisabled || loading || refreshStatus.status === "refreshing";

  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            표준공수 산출
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {selectedSolutionVariants.length}개 솔루션
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshDisabled}
            title="새로고침 시 미저장 입력값은 초기화될 수 있습니다."
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            표준공수 새로고침
          </button>
          <RefreshStatusBadge refreshStatus={refreshStatus} />
          <SaveStatusBadge saveStatus={saveStatus} />
        </div>
      </div>

      {loading ? (
        <Notice>표준공수 메타를 불러오는 중입니다.</Notice>
      ) : null}

      {error ? (
        <Notice tone="error">표준공수 데이터를 불러오지 못했습니다.</Notice>
      ) : null}

      {saveStatus.status === "failed" ? (
        <Notice tone="error">{saveStatus.message}</Notice>
      ) : null}

      {refreshStatus.status === "failed" ? (
        <Notice tone="error">{refreshStatus.message}</Notice>
      ) : null}

      {!hasSolutionVariants && !loading ? (
        <EmptyState>
          표준공수 솔루션 메타가 없습니다. 관리자에게 문의하세요.
        </EmptyState>
      ) : null}

      {hasSolutionVariants ? (
        <>
          <StandardSolutionVariantSelector
            solutionVariants={sortedVariants}
            projectSolutionSelections={projectSolutionSelections}
            onToggleSolution={onToggleSolution}
            readOnly={solutionControlsDisabled}
          />

          {selectedSolutionVariants.length === 0 ? (
            <EmptyState>
              선택된 솔루션이 없습니다. 표준공수를 산정할 솔루션을 먼저
              선택하세요.
            </EmptyState>
          ) : itemRows.length === 0 ? (
            <EmptyState>
              표준공수 기능항목 메타가 없습니다. 관리자에게 문의하세요.
            </EmptyState>
          ) : (
            <StandardEffortCheckTable
              itemRows={itemRows}
              selectedSolutionVariants={selectedSolutionVariants}
              projectItemSelections={projectItemSelections}
              onToggleItem={onToggleItem}
              readOnly={itemControlsDisabled}
            />
          )}

          <StandardEffortSummary
            results={results}
            totals={totals}
            onChangeActualEffort={onChangeActualEffort}
            readOnly={actualEffortControlsDisabled}
          />
        </>
      ) : null}
    </section>
  );
}
