import React from "react";
import { useEstimatorStore } from "../../../store/useEstimatorStore";
import { SOLUTIONS } from "../../../shared/constants/constants";

export default function SolutionTabs({ activeTab, setActiveTab }) {
  const codebooks = useEstimatorStore((s) => s.codebooks || []);

  const metaTabs = codebooks
    .filter((code) => code.group_code === "SOLUTION" && code.is_active)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((code) => ({
      key: code.code,
      label: code.code_name,
      icon: null,
    }));

  const tabs = metaTabs.length > 0 ? metaTabs : SOLUTIONS;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <div className="grid grid-cols-7 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex h-10 min-w-0 items-center justify-center gap-1 rounded-xl px-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
