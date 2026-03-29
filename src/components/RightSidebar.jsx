import React from "react";
import { scaleOptions, riskOptions } from "../utils/constants";
import { fmt } from "../utils/estimatorMath";
import SmallInput from "./ui/SmallInput";
import SmallSelect from "./ui/SmallSelect";

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
  solutionTotals,
  grandBaseTotal,
  scaledTotal,
  riskAppliedTotal,
  mgmtRate,
  mgmtMd,
  finalTotal,
  scaleFactor,
  setScaleFactor,
  riskFactor,
  setRiskFactor,
  setMgmtRate,
  markDirty,
  isSummary = false,
}) {
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
                value={mgmtRate}
                onChange={(e) => {
                  setMgmtRate(Number(e.target.value || 0));
                  markDirty();
                }}
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="공수 산출 요약" subtle className="flex-1">
        <div className="flex h-full flex-col justify-between text-sm">
          <div className="space-y-2">
            {!isSummary && (
              <div className="flex justify-between">
                <span className="text-slate-500">현재 탭</span>
                <strong>{fmt(solutionTotals[activeTab] || 0)} MD</strong>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-500">전체</span>
              <strong>{fmt(grandBaseTotal)} MD</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">규모 반영</span>
              <strong>{fmt(scaledTotal)} MD</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">리스크 반영</span>
              <strong>{fmt(riskAppliedTotal)} MD</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">관리 ({mgmtRate}%)</span>
              <strong>{fmt(mgmtMd)} MD</strong>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-center">
            <div className="mb-1 text-xs font-bold text-blue-600">
              최종 공수
            </div>
            <div className="text-3xl font-extrabold text-blue-600">
              {fmt(finalTotal)} MD
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}