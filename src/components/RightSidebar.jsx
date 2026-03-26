import React from "react";
import { scaleOptions, riskOptions } from "../utils/constants";
import { fmt } from "../utils/estimatorMath";
import SmallInput from "./ui/SmallInput";
import SmallSelect from "./ui/SmallSelect";

function Panel({ title, children, subtle = false }) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border ${
        subtle
          ? "border-blue-100 bg-gradient-to-br from-white to-blue-50/40"
          : "border-slate-200 bg-white"
      } shadow-[0_12px_32px_rgba(15,23,42,0.05)]`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
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
    <div className="space-y-5 lg:sticky lg:top-6">
      <Panel title="환경 변수 설정" subtle>
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
              <span>규모 (Scale Factor)</span>
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
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
              <span>리스크 (Risk Factor)</span>
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
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
              <span>관리 비율 (Project Mgmt)</span>
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

      <Panel title="공수 산출 요약" subtle>
        <div className="space-y-3 text-sm leading-6">
          {!isSummary ? (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">현재 탭 소계</span>
              <strong>{fmt(solutionTotals[activeTab] || 0)} MD</strong>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-slate-500">전체 기본 산정</span>
            <strong>{fmt(grandBaseTotal)} MD</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">규모 반영</span>
            <strong>{fmt(scaledTotal)} MD</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">리스크 반영</span>
            <strong>{fmt(riskAppliedTotal)} MD</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">관리 공수 ({mgmtRate}%)</span>
            <strong>{fmt(mgmtMd)} MD</strong>
          </div>

          <div className="mt-4 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
            <div className="mb-2 text-sm font-bold text-blue-600">최종 산출 공수</div>
            <div className="text-[52px] font-extrabold leading-none tracking-tight text-blue-600">
              {fmt(finalTotal)}
              <span className="ml-2 text-[28px]">MD</span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}