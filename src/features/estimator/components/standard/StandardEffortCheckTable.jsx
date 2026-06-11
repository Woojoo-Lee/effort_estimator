import React, { useMemo } from "react";

function getVariantLabel(variant = {}) {
  if (variant.display_name) {
    return variant.display_name;
  }

  return [variant.solution_name, variant.variant_name]
    .filter(Boolean)
    .join(" ");
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function sortItems(itemRows = []) {
  return [...itemRows].sort((a, b) => {
    const categoryCompare = normalizeText(a.category_l1).localeCompare(
      normalizeText(b.category_l1)
    );

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return Number(a.display_order || 0) - Number(b.display_order || 0);
  });
}

function buildCheckedSet(projectItemSelections = []) {
  return new Set(
    projectItemSelections
      .filter((selection) => selection.checked === true)
      .map(
        (selection) =>
          `${selection.solution_variant_id}:${selection.item_id}`
      )
  );
}

function getItemOption(item = {}) {
  return normalizeText(item.item_option).trim();
}

export default function StandardEffortCheckTable({
  itemRows = [],
  selectedSolutionVariants = [],
  projectItemSelections = [],
  onToggleItem,
  readOnly = false,
}) {
  const sortedItems = useMemo(() => sortItems(itemRows), [itemRows]);
  const checkedSet = useMemo(
    () => buildCheckedSet(projectItemSelections),
    [projectItemSelections]
  );

  if (selectedSolutionVariants.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
        선택된 솔루션이 없습니다. 표준공수를 산정할 솔루션을 먼저 선택하세요.
      </div>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
        표준공수 기능항목 메타가 없습니다. 관리자에게 문의하세요.
      </div>
    );
  }

  let lastCategory = null;

  return (
    <section className="space-y-3" aria-label="표준공수 기능항목 선택">
      <h3 className="text-sm font-bold text-slate-900">기능항목 선택</h3>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full border-collapse bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="w-36 px-3 py-3">구분</th>
              <th className="w-48 px-3 py-3">기능항목</th>
              <th className="w-44 px-3 py-3">옵션</th>
              {selectedSolutionVariants.map((variant) => (
                <th
                  key={variant.solution_variant_id}
                  className="min-w-24 px-3 py-3 text-center"
                >
                  {getVariantLabel(variant)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedItems.flatMap((item) => {
              const rows = [];
              const category = normalizeText(item.category_l1);

              if (category !== lastCategory) {
                lastCategory = category;
                rows.push(
                  <tr
                    key={`category-${category}`}
                    className="border-b border-slate-100 bg-slate-50/70"
                  >
                    <td
                      colSpan={3 + selectedSolutionVariants.length}
                      className="px-3 py-2 text-xs font-extrabold text-slate-700"
                    >
                      {category || "기타"}
                    </td>
                  </tr>
                );
              }

              rows.push(
                <tr
                  key={item.item_id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-3 py-3 text-slate-500">{category}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">
                    {item.item_name}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {getItemOption(item)}
                  </td>
                  {selectedSolutionVariants.map((variant) => {
                    const checked = checkedSet.has(
                      `${variant.solution_variant_id}:${item.item_id}`
                    );
                    const label = `${getVariantLabel(variant)} ${
                      item.item_name
                    } ${getItemOption(item)} 선택`.replace(/\s+/g, " ");

                    return (
                      <td
                        key={`${variant.solution_variant_id}:${item.item_id}`}
                        className="px-3 py-3 text-center"
                      >
                        <input
                          type="checkbox"
                          aria-label={label}
                          checked={checked}
                          disabled={readOnly}
                          onChange={(event) =>
                            onToggleItem?.(
                              variant.solution_variant_id,
                              item.item_id,
                              event.target.checked
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                      </td>
                    );
                  })}
                </tr>
              );

              return rows;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
