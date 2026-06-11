import React, { useEffect, useMemo, useRef, useState } from "react";

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 4,
  });
}

function getVariantLabel(variant = {}) {
  return (
    variant.display_name ||
    [variant.solution_name, variant.variant_name].filter(Boolean).join(" ") ||
    "-"
  );
}

function sortVariants(rows = []) {
  return [...rows].sort((a, b) => {
    const orderCompare = toNumber(a.display_order) - toNumber(b.display_order);

    if (orderCompare !== 0) {
      return orderCompare;
    }

    return getVariantLabel(a).localeCompare(getVariantLabel(b));
  });
}

function sortItems(rows = []) {
  return [...rows].sort((a, b) => {
    const orderCompare = toNumber(a.display_order) - toNumber(b.display_order);

    if (orderCompare !== 0) {
      return orderCompare;
    }

    return toNumber(a.excel_row_no) - toNumber(b.excel_row_no);
  });
}

function buildCoefficientMap(rows = []) {
  return new Map(
    rows.map((row) => [
      `${row.item_id}:${row.solution_variant_id}`,
      row.coefficient ?? 0,
    ])
  );
}

function readDraftValue({
  coefficientMap,
  draftRow,
  itemId,
  solutionVariantId,
}) {
  if (
    draftRow &&
    Object.prototype.hasOwnProperty.call(draftRow, solutionVariantId)
  ) {
    return draftRow[solutionVariantId];
  }

  return String(coefficientMap.get(`${itemId}:${solutionVariantId}`) ?? 0);
}

function validateDraftRow(draftRow = {}, variants = []) {
  for (const variant of variants) {
    const value = draftRow[variant.solution_variant_id];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "계수는 숫자여야 합니다.";
    }

    if (numericValue < 0) {
      return "계수는 0 이상이어야 합니다.";
    }
  }

  return "";
}

export default function StandardCoefficientGrid({
  solutionVariants = [],
  itemRows = [],
  coefficientRows = [],
  coefficientDrafts = {},
  coefficientDirtyMap = {},
  coefficientSavingMap = {},
  coefficientErrorMap = {},
  coefficientSavedMap = {},
  itemActiveSavingMap = {},
  itemActiveErrorMap = {},
  itemActiveSavedMap = {},
  onChangeCoefficientDraft,
  onResetCoefficientDraft,
  onSaveCoefficientRow,
  onToggleStandardItemActive,
  readOnlyCoefficient = false,
  readOnlyActive = false,
}) {
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const variants = useMemo(
    () => sortVariants(solutionVariants),
    [solutionVariants]
  );
  const items = useMemo(() => sortItems(itemRows), [itemRows]);
  const coefficientMap = useMemo(
    () => buildCoefficientMap(coefficientRows),
    [coefficientRows]
  );

  useEffect(() => {
    const table = tableRef.current;

    if (!table) {
      setTableScrollWidth(0);
      return undefined;
    }

    const measure = () => {
      setTableScrollWidth(table.scrollWidth || table.offsetWidth || 0);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(measure);

    observer.observe(table);

    return () => observer.disconnect();
  }, [items.length, variants.length]);

  function syncScroll(sourceRef, targetRef) {
    const source = sourceRef.current;
    const target = targetRef.current;

    if (!source || !target || target.scrollLeft === source.scrollLeft) {
      return;
    }

    target.scrollLeft = source.scrollLeft;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
        표시할 표준공수 기능항목 메타가 없습니다.
      </div>
    );
  }

  let lastCategory = null;

  return (
    <section className="space-y-3" aria-label="표준공수 기능항목 계수">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">
          기능항목/계수
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          계수는 단위 없는 배율 값입니다. 누락 값은 0으로 표시합니다.
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          오른쪽 솔루션 계수는 가로 스크롤로 확인할 수 있습니다.
        </p>
      </div>

      <div
        ref={topScrollRef}
        data-testid="standard-coefficient-top-scroll"
        className="h-5 overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 bg-slate-50"
        onScroll={() => syncScroll(topScrollRef, tableScrollRef)}
        aria-hidden="true"
      >
        <div
          className="h-1"
          style={{ width: tableScrollWidth ? `${tableScrollWidth}px` : "100%" }}
        />
      </div>

      <div
        ref={tableScrollRef}
        data-testid="standard-coefficient-grid-scroll"
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white"
        onScroll={() => syncScroll(tableScrollRef, topScrollRef)}
      >
        <table ref={tableRef} className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-extrabold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="w-36 px-3 py-3">구분</th>
              <th className="w-48 px-3 py-3">기능항목</th>
              <th className="w-44 px-3 py-3">옵션</th>
              {variants.map((variant) => (
                <th
                  key={variant.solution_variant_id}
                  className="min-w-28 px-3 py-3 text-right"
                >
                  {getVariantLabel(variant)}
                  {variant.active === false ? " (미사용)" : ""}
                </th>
              ))}
              <th className="px-3 py-3 text-center">사용 여부</th>
              <th className="px-3 py-3 text-center">저장</th>
            </tr>
          </thead>
          <tbody>
            {items.flatMap((item) => {
              const rows = [];
              const category = normalizeText(item.category_l1);
              const itemId = item.item_id;
              const draftRow = coefficientDrafts[itemId] || {};
              const rowDraft = variants.reduce((result, variant) => {
                result[variant.solution_variant_id] = readDraftValue({
                  coefficientMap,
                  draftRow,
                  itemId,
                  solutionVariantId: variant.solution_variant_id,
                });
                return result;
              }, {});
              const validationError = validateDraftRow(rowDraft, variants);
              const dirty = coefficientDirtyMap[itemId] === true;
              const saving = coefficientSavingMap[itemId] === true;
              const saved = coefficientSavedMap[itemId] === true;
              const activeSaving = itemActiveSavingMap[itemId] === true;
              const activeSaved = itemActiveSavedMap[itemId] === true;
              const rowError =
                validationError ||
                coefficientErrorMap[itemId] ||
                itemActiveErrorMap[itemId];

              if (category !== lastCategory) {
                lastCategory = category;
                rows.push(
                  <tr
                    key={`category-${category}`}
                    className="border-b border-slate-100 bg-slate-50/80"
                  >
                    <td
                      colSpan={5 + variants.length}
                      className="px-3 py-2 text-xs font-extrabold text-slate-700"
                    >
                      {category || "기타"}
                    </td>
                  </tr>
                );
              }

              rows.push(
                <React.Fragment key={itemId}>
                  <tr
                    className={`border-b border-slate-100 ${
                      item.active === false ? "bg-slate-50 text-slate-400" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-slate-500">{category}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {item.item_name}
                      {dirty ? (
                        <span className="ml-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                          변경됨
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {normalizeText(item.item_option).trim()}
                    </td>
                    {variants.map((variant) => {
                      const label = getVariantLabel(variant);

                      return (
                        <td
                          key={`${itemId}:${variant.solution_variant_id}`}
                          className="px-3 py-3 text-right"
                        >
                          <input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={rowDraft[variant.solution_variant_id]}
                            aria-label={`${item.item_name} ${label} 계수`}
                            onChange={(event) => {
                              if (readOnlyCoefficient) {
                                return;
                              }

                              onChangeCoefficientDraft?.(
                                itemId,
                                variant.solution_variant_id,
                                event.target.value
                              );
                            }}
                            className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                            disabled={
                              readOnlyCoefficient || saving || activeSaving
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      <label className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.active !== false}
                          aria-label={`${item.item_name} 사용 여부`}
                          onChange={(event) => {
                            if (readOnlyActive) {
                              return;
                            }

                            onToggleStandardItemActive?.(
                              itemId,
                              event.target.checked
                            );
                          }}
                          disabled={readOnlyActive || saving || activeSaving}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span
                          className={`rounded-lg px-2 py-1 ${
                            item.active === false
                              ? "bg-slate-100 text-slate-500"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {activeSaving
                            ? "저장 중..."
                            : activeSaved
                              ? "저장 완료"
                              : item.active === false
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
                              if (readOnlyCoefficient) {
                                return;
                              }

                              onResetCoefficientDraft?.(itemId);
                            }}
                            disabled={
                              readOnlyCoefficient || saving || activeSaving
                            }
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            되돌리기
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (readOnlyCoefficient) {
                              return;
                            }

                            onSaveCoefficientRow?.(itemId);
                          }}
                          disabled={
                            readOnlyCoefficient ||
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
                        colSpan={5 + variants.length}
                        className="bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                      >
                        {rowError}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );

              return rows;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
