import React from "react";

const TABS = [
  { key: "baseEffort", label: "솔루션/기본공수" },
  { key: "coefficients", label: "기능항목/계수" },
  { key: "summary", label: "검증 요약" },
];

export default function StandardEffortMetaTabs({
  activeTab = "baseEffort",
  onChange,
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange?.(tab.key)}
            className={`h-10 border-b-2 px-3 text-sm font-extrabold transition ${
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
