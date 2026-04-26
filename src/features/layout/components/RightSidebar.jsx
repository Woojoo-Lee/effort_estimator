import React from "react";
import { useEstimatorStore } from "../../../store/useEstimatorStore";
import {
  getRiskOptions,
  getScaleOptions,
} from "../../../shared/lib/estimatorMeta";
import { fmt } from "../../../shared/lib/estimatorMath";
import SmallInput from "../../../shared/ui/SmallInput";
import SmallSelect from "../../../shared/ui/SmallSelect";

const TEXT = {
  envVarMetaTitle: "환경변수 메타",
  noEnvVarMeta: "환경변수 메타가 없습니다.",
  emptyValue: "-",
};

function Panel({ title, children, subtle = false, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border ${
        subtle
          ? "border-blue-100 bg-gradient-to-br from-white to-blue-50/40"
          : "border-slate-200 bg-white"
      } shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function RightSidebar({
  activeTab,
  grandBaseTotal,
  sidebarBaseTotal,
  sidebarScaledTotal,
  sidebarRiskAppliedTotal,
  mgmtRate,
  sidebarMgmtMd,
  sidebarFinalTotal,
  scaleFactor,
  setScaleFactor,
  riskFactor,
  setRiskFactor,
  setMgmtRate,
  markDirty,
  envVarMetaRows = [],
  isSummary = false,
}) {
  const codebooks = useEstimatorStore((s) => s.codebooks || []);
  const scaleOptions = getScaleOptions(codebooks);
  const riskOptions = getRiskOptions(codebooks);
  const activeEnvVarMetaRows = envVarMetaRows.filter(
    (row) => row.solution_code === activeTab && row.is_active !== false
  );
  const baseTotal = Number(sidebarBaseTotal ?? grandBaseTotal ?? 0);
  const scaledTotal = Number(sidebarScaledTotal ?? 0);
  const riskAppliedTotal = Number(sidebarRiskAppliedTotal ?? 0);
  const mgmtMd = Number(sidebarMgmtMd ?? 0);
  const finalTotal = Number(sidebarFinalTotal ?? 0);

  return (
    <div className="flex h-full flex-col gap-4">
      <Panel title="환경 변수 설정" subtle className="shrink-0">
        <div className="space-y-4 text-sm">
          <div>
            <div className="mb-1 flex items-center justify-between font-semibold">
              <span>규모</span>
              <span className="text-blue-600">{fmt(scaleFactor)}x</span>
            </div>
            <SmallSelect
              value={scaleFactor}
              onChange={(e) => {
                setScaleFactor(Number(e.target.value));
                markDirty();
              }}
            >
              {scaleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SmallSelect>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between font-semibold">
              <span>리스크</span>
              <span className="text-blue-600">{fmt(riskFactor)}x</span>
            </div>
            <SmallSelect
              value={riskFactor}
              onChange={(e) => {
                setRiskFactor(Number(e.target.value));
                markDirty();
              }}
            >
              {riskOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SmallSelect>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between font-semibold">
              <span>관리 비율</span>
              <span className="text-blue-600">{mgmtRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <SmallInput
                type="number"
                step="0.01"
                value={mgmtRate}
                onChange={(e) => {
                  const num = parseFloat(e.target.value || 0);
                  const fixed = Math.round(num * 100) / 100;
                  setMgmtRate(fixed);
                  markDirty();
                }}
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={TEXT.envVarMetaTitle} className="shrink-0">
        {activeEnvVarMetaRows.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            {TEXT.noEnvVarMeta}
          </div>
        ) : (
          <div className="space-y-2">
            {activeEnvVarMetaRows.map((row) => (
              <div
                key={`${row.solution_code}-${row.var_key}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-800">
                      {row.var_name || TEXT.emptyValue}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-400">
                      {row.var_key || TEXT.emptyValue} ·{" "}
                      {row.value_type || TEXT.emptyValue}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold text-blue-600">
                    {row.default_value ?? TEXT.emptyValue}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="공수 산출 요약" subtle className="flex-1">
        <div className="flex h-full flex-col justify-between text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">현재 탭</span>
              <strong>{isSummary ? "전체 요약" : activeTab}</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">기준 공수</span>
              <strong>{fmt(baseTotal)} M/M</strong>
            </div>

            {isSummary && (
              <div className="flex justify-between">
                <span className="text-slate-500">전체 프로젝트 합계</span>
                <strong>{fmt(grandBaseTotal)} M/M</strong>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-500">규모 반영</span>
              <strong>{fmt(scaledTotal)} M/M</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">리스크 반영</span>
              <strong>{fmt(riskAppliedTotal)} M/M</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">관리 ({mgmtRate}%)</span>
              <strong>{fmt(mgmtMd)} M/M</strong>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-50 to-white p-5 text-center">
            <div className="mb-2 text-xs font-bold text-blue-600">최종 공수</div>
            <div className="text-4xl font-extrabold text-blue-600">
              {fmt(finalTotal)}
              <span className="ml-1 text-lg font-semibold text-blue-400">
                M/M
              </span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
