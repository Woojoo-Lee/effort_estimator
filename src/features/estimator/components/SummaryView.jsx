import React from "react";
import { SOLUTIONS } from "../../../shared/constants/constants";
import { fmt } from "../../../shared/lib/estimatorMath";

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

export default function SummaryView({ solutionTotals, grandBaseTotal }) {
  return (
    <Panel title="솔루션별 공수 요약" subtle>
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="min-w-full border-collapse bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
              <th className="py-3 pr-4 pl-4">솔루션</th>
              <th className="py-3 pr-4 text-right">기본 산정 합계</th>
              <th className="py-3 pr-4 text-right">비중</th>
            </tr>
          </thead>
          <tbody>
            {SOLUTIONS.filter((s) => s.key !== "summary").map((sol) => {
              const total = solutionTotals[sol.key] || 0;
              const ratio = grandBaseTotal > 0 ? (total / grandBaseTotal) * 100 : 0;

              return (
                <tr key={sol.key} className="border-b border-slate-100 text-sm">
                  <td className="py-4 pr-4 pl-4 font-semibold text-slate-900">
                    {sol.icon} {sol.label}
                  </td>
                  <td className="py-4 pr-4 text-right text-slate-800">
                    {fmt(total)} MD
                  </td>
                  <td className="py-4 pr-4 text-right text-slate-500">
                    {fmt(ratio)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}