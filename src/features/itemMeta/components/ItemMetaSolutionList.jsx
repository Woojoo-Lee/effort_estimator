import React from "react";

const TEXT = {
  loading: "\uC194\uB8E8\uC158 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.",
  empty: "\uD45C\uC2DC\uD560 \uC194\uB8E8\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  title: "\uC194\uB8E8\uC158 \uBAA9\uB85D",
  active: "\uC0AC\uC6A9",
  inactive: "\uBBF8\uC0AC\uC6A9",
  unknown: "UNKNOWN",
};

function getSolutionCode(solution) {
  return solution.solutionCode || solution.solution_code || TEXT.unknown;
}

export default function ItemMetaSolutionList({
  solutions = [],
  selectedSolutionCode = "",
  onSelectSolution,
  isBusy = false,
}) {
  if (isBusy) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.loading}
      </div>
    );
  }

  if (solutions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-extrabold text-slate-900">
          {TEXT.title}
        </h2>
      </div>

      <div className="divide-y divide-slate-100">
        {solutions.map((solution) => {
          const solutionCode = getSolutionCode(solution);
          const isSelected = selectedSolutionCode === solutionCode;

          return (
            <button
              key={solutionCode}
              type="button"
              onClick={() => onSelectSolution?.(solutionCode)}
              className={`block w-full px-4 py-3 text-left transition ${
                isSelected
                  ? "bg-blue-50 text-blue-700"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold">
                    {solutionCode}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {TEXT.active} {solution.activeCount ?? 0} /{" "}
                    {TEXT.inactive} {solution.inactiveCount ?? 0}
                  </div>
                </div>
                <div
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${
                    isSelected
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {solution.totalCount ?? 0}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
