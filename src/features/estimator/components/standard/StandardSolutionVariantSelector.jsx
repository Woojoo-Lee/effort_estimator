import React, { useMemo } from "react";

function getVariantLabel(variant = {}) {
  if (variant.display_name) {
    return variant.display_name;
  }

  return [variant.solution_name, variant.variant_name]
    .filter(Boolean)
    .join(" ");
}

function getSelectionMap(projectSolutionSelections = []) {
  return new Map(
    projectSolutionSelections.map((selection) => [
      selection.solution_variant_id,
      selection.enabled === true,
    ])
  );
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

export default function StandardSolutionVariantSelector({
  solutionVariants = [],
  projectSolutionSelections = [],
  onToggleSolution,
  readOnly = false,
}) {
  const selectionMap = useMemo(
    () => getSelectionMap(projectSolutionSelections),
    [projectSolutionSelections]
  );
  const variants = useMemo(
    () => sortByDisplayOrder(solutionVariants),
    [solutionVariants]
  );

  return (
    <section className="space-y-3" aria-label="표준공수 솔루션 선택">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">솔루션 선택</h3>
        <span className="text-xs font-semibold text-slate-400">
          {projectSolutionSelections.filter((selection) => selection.enabled)
            .length}
          /{variants.length}
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2">
        {variants.map((variant) => {
          const label = getVariantLabel(variant);
          const checked = selectionMap.get(variant.solution_variant_id) === true;

          return (
            <label
              key={variant.solution_variant_id}
              className={`flex h-10 min-w-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                checked
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600"
              } ${readOnly ? "opacity-70" : "hover:border-slate-300"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={readOnly}
                onChange={(event) =>
                  onToggleSolution?.(
                    variant.solution_variant_id,
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span className="truncate">{label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
