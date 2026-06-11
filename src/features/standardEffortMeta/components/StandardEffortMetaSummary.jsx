import React from "react";

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
    : "0";
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${formatNumber(value)}%`;
}

function StatusBadge({ status }) {
  const tone =
    status === "정상" || status === "일치"
      ? "bg-emerald-50 text-emerald-700"
      : status === "계산 불가"
        ? "bg-slate-100 text-slate-500"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${tone}`}>
      {status || "주의"}
    </span>
  );
}

function CountCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-900">
        {formatNumber(value)}
      </div>
    </div>
  );
}

function MetricCard({ label, value, status }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-500">{label}</div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <div className="mt-1 text-xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

export default function StandardEffortMetaSummary({ summary }) {
  const currentSummary = summary || {};
  const coefficientMatrix = currentSummary.coefficient_matrix_check || {};
  const s1Preview = currentSummary.s1_fixture_preview || {};

  return (
    <section className="space-y-4" aria-label="표준공수 메타 검증 요약">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">검증 요약</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          현재 DB에 적재된 표준공수 메타 row 수, 기본공수합, 계수 행렬,
          에스원 fixture 기준 산출값을 확인합니다.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-extrabold text-slate-700">
          Row Count
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-extrabold text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3">항목</th>
                <th className="px-3 py-3 text-right">현재</th>
                <th className="px-3 py-3 text-right">seed 기준</th>
                <th className="px-3 py-3 text-right">차이</th>
                <th className="px-3 py-3 text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {(currentSummary.row_count_checks || []).map((row) => (
                <tr key={row.key} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-bold text-slate-900">
                    {row.label}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">
                    {formatNumber(row.actual)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">
                    {formatNumber(row.expected)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">
                    {formatNumber(row.difference)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CountCard label="solution 수" value={currentSummary.solution_count} />
        <CountCard
          label="solution variant 수"
          value={currentSummary.solution_variant_count}
        />
        <CountCard
          label="base effort row 수"
          value={currentSummary.base_effort_count}
        />
        <CountCard label="item row 수" value={currentSummary.item_count} />
        <CountCard
          label="coefficient row 수"
          value={currentSummary.coefficient_count}
        />
        <CountCard
          label="active solution variant 수"
          value={currentSummary.active_solution_variant_count}
        />
        <CountCard
          label="active item 수"
          value={currentSummary.active_item_count}
        />
        <CountCard
          label="active coefficient 수"
          value={currentSummary.active_coefficient_count}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="coefficient expected matrix"
          value={formatNumber(coefficientMatrix.expected_row_count)}
          status={coefficientMatrix.status}
        />
        <MetricCard
          label="coefficient actual rows"
          value={formatNumber(coefficientMatrix.actual_row_count)}
        />
        <MetricCard
          label="coefficient missing"
          value={formatNumber(coefficientMatrix.missing_count)}
        />
        <MetricCard
          label="coefficient duplicate"
          value={formatNumber(coefficientMatrix.duplicate_count)}
        />
        <MetricCard
          label="coefficient completeness"
          value={formatPercent(coefficientMatrix.completeness_percentage)}
          status={coefficientMatrix.status}
        />
        <MetricCard
          label="active matrix expected"
          value={formatNumber(coefficientMatrix.active_expected_row_count)}
          status={coefficientMatrix.active_status}
        />
        <MetricCard
          label="active matrix missing"
          value={formatNumber(coefficientMatrix.active_missing_count)}
        />
        <MetricCard
          label="active completeness"
          value={formatPercent(
            coefficientMatrix.active_completeness_percentage
          )}
          status={coefficientMatrix.active_status}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-700">
          대표 기본공수합
        </div>
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-extrabold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-3">대표값</th>
              <th className="px-3 py-3 text-right">현재 기본공수합(M/M)</th>
              <th className="px-3 py-3 text-right">기대값(M/M)</th>
              <th className="px-3 py-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {(currentSummary.base_total_checks || []).map((target) => {
              return (
                <tr key={target.label} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-bold text-slate-900">
                    {target.label}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">
                    {formatNumber(target.actual)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">
                    {formatNumber(target.expected)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={target.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-700">
          전체 variant 기본공수합
        </div>
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-extrabold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-3">솔루션</th>
              <th className="px-3 py-3 text-right">기본공수합(M/M)</th>
            </tr>
          </thead>
          <tbody>
            {(currentSummary.base_total_by_variant || []).map((row) => (
              <tr
                key={row.solution_variant_id}
                className="border-b border-slate-100"
              >
                <td className="px-3 py-3 font-bold text-slate-900">
                  {row.display_name}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-700">
                  {formatNumber(row.base_total_mm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs font-extrabold text-slate-700">
            에스원 fixture 산출 미리보기
          </div>
          <StatusBadge status={s1Preview.status} />
        </div>
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-extrabold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-3">솔루션</th>
              <th className="px-3 py-3 text-right">seed 기준(M/M)</th>
              <th className="px-3 py-3 text-right">현재 계산(M/M)</th>
              <th className="px-3 py-3 text-right">차이</th>
              <th className="px-3 py-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {(s1Preview.rows || []).map((row) => (
              <tr key={row.key} className="border-b border-slate-100">
                <td className="px-3 py-3 font-bold text-slate-900">
                  {row.label}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-700">
                  {formatNumber(row.expected_standard_effort_mm)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-700">
                  {formatNumber(row.current_standard_effort_mm)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-700">
                  {formatNumber(row.difference_mm)}
                </td>
                <td className="px-3 py-3 text-center">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-extrabold">
              <td className="px-3 py-3 text-slate-900">합계</td>
              <td className="px-3 py-3 text-right text-slate-900">
                {formatNumber(s1Preview.expected_total_mm)}
              </td>
              <td className="px-3 py-3 text-right text-slate-900">
                {formatNumber(s1Preview.current_total_mm)}
              </td>
              <td className="px-3 py-3 text-right text-slate-900">
                {formatNumber(s1Preview.difference_mm)}
              </td>
              <td className="px-3 py-3 text-center">
                <StatusBadge status={s1Preview.status} />
              </td>
            </tr>
          </tbody>
        </table>
        {s1Preview.missing_variant_keys?.length ||
        s1Preview.missing_excel_rows?.length ? (
          <div className="border-t border-slate-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            계산 불가 항목:
            {s1Preview.missing_variant_keys?.length
              ? ` variant ${s1Preview.missing_variant_keys.join(", ")}`
              : ""}
            {s1Preview.missing_excel_rows?.length
              ? ` excel row ${s1Preview.missing_excel_rows.join(", ")}`
              : ""}
          </div>
        ) : null}
      </div>
    </section>
  );
}
