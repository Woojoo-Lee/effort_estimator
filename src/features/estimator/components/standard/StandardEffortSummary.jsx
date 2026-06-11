import React, { useEffect, useMemo, useRef, useState } from "react";

function getVariantLabel(row = {}) {
  if (row.display_name) {
    return row.display_name;
  }

  return [row.solution_name, row.variant_name].filter(Boolean).join(" ");
}

function readNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const num = Number(value);

  return Number.isFinite(num) ? num : 0;
}

function addNumber(sum, value) {
  return Number((sum + readNumber(value)).toFixed(10));
}

function formatMm(value) {
  return readNumber(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  });
}

function toInputValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function buildTotals(results = []) {
  return {
    base_total_mm: results.reduce(
      (sum, row) => addNumber(sum, row.base_total_mm),
      0
    ),
    coefficient_total: results.reduce(
      (sum, row) => addNumber(sum, row.coefficient_total),
      0
    ),
    standard_effort_mm: results.reduce(
      (sum, row) => addNumber(sum, row.standard_effort_mm),
      0
    ),
    actual_effort_mm: results.reduce(
      (sum, row) => addNumber(sum, row.actual_effort_mm),
      0
    ),
    gap_mm: results.reduce((sum, row) => addNumber(sum, row.gap_mm), 0),
    solution_count: results.length,
  };
}

function getGap(row = {}) {
  if (row.gap_mm !== null && row.gap_mm !== undefined) {
    return readNumber(row.gap_mm);
  }

  return Number(
    (readNumber(row.standard_effort_mm) - readNumber(row.actual_effort_mm))
      .toFixed(10)
  );
}

function getGapClassName(value) {
  if (value > 0) {
    return "text-rose-600";
  }

  if (value < 0) {
    return "text-blue-600";
  }

  return "text-slate-700";
}

function ActualEffortInput({
  row,
  onChangeActualEffort,
  readOnly = false,
}) {
  const originalValue = row.actual_effort_mm;
  const lastCommittedNumberRef = useRef(readNumber(originalValue));
  const [draft, setDraft] = useState(toInputValue(originalValue));

  useEffect(() => {
    setDraft(toInputValue(originalValue));
    lastCommittedNumberRef.current = readNumber(originalValue);
  }, [originalValue, row.solution_variant_id]);

  const resetDraft = () => {
    setDraft(toInputValue(originalValue));
  };

  const commitDraft = () => {
    if (readOnly) {
      return;
    }

    const committedValue = draft === "" ? 0 : draft;
    const committedNumber = readNumber(committedValue);

    if (committedNumber === readNumber(originalValue)) {
      resetDraft();
      return;
    }

    if (committedNumber === lastCommittedNumberRef.current) {
      return;
    }

    lastCommittedNumberRef.current = committedNumber;

    Promise.resolve(
      onChangeActualEffort?.(row.solution_variant_id, committedValue)
    )
      .then((result) => {
        if (result === false) {
          lastCommittedNumberRef.current = readNumber(originalValue);
          resetDraft();
          return;
        }

        if (draft === "") {
          setDraft("0");
        }
      })
      .catch(() => {
        lastCommittedNumberRef.current = readNumber(originalValue);
        resetDraft();
      });
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={`${getVariantLabel(row)} 실투입공수`}
      value={draft}
      disabled={readOnly}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitDraft();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          resetDraft();
        }
      }}
      className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-semibold text-slate-700 disabled:bg-slate-50"
    />
  );
}

export default function StandardEffortSummary({
  results = [],
  totals,
  onChangeActualEffort,
  readOnly = false,
}) {
  const summaryTotals = useMemo(
    () => totals || buildTotals(results),
    [results, totals]
  );

  return (
    <section className="space-y-3" aria-label="표준공수 요약">
      <h3 className="text-sm font-bold text-slate-900">산출 요약</h3>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full border-collapse bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-3">솔루션</th>
              <th className="px-3 py-3 text-right">기본공수합(M/M)</th>
              <th className="px-3 py-3 text-right">선택계수합</th>
              <th className="px-3 py-3 text-right">표준공수(M/M)</th>
              <th className="px-3 py-3 text-right">실투입공수(M/M)</th>
              <th className="px-3 py-3 text-right">GAP(M/M)</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr className="border-b border-slate-100">
                <td
                  colSpan={6}
                  className="px-3 py-5 text-center text-sm font-semibold text-slate-500"
                >
                  산출 결과가 없습니다.
                </td>
              </tr>
            ) : (
              results.map((row) => {
                const gap = getGap(row);

                return (
                  <tr
                    key={row.solution_variant_id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {getVariantLabel(row)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {formatMm(row.base_total_mm)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {formatMm(row.coefficient_total)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">
                      {formatMm(row.standard_effort_mm)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ActualEffortInput
                        row={row}
                        onChangeActualEffort={onChangeActualEffort}
                        readOnly={readOnly}
                      />
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold ${getGapClassName(
                        gap
                      )}`}
                    >
                      {formatMm(gap)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-extrabold text-slate-900">
              <td className="px-3 py-3">합계</td>
              <td className="px-3 py-3 text-right">
                {formatMm(summaryTotals.base_total_mm)}
              </td>
              <td className="px-3 py-3 text-right">
                {formatMm(summaryTotals.coefficient_total)}
              </td>
              <td className="px-3 py-3 text-right">
                {formatMm(summaryTotals.standard_effort_mm)}
              </td>
              <td className="px-3 py-3 text-right">
                {formatMm(summaryTotals.actual_effort_mm)}
              </td>
              <td
                className={`px-3 py-3 text-right ${getGapClassName(
                  readNumber(summaryTotals.gap_mm)
                )}`}
              >
                {formatMm(summaryTotals.gap_mm)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
