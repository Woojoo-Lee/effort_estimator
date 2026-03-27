import React from "react";
import { SOLUTIONS } from "../utils/constants";

export default function SolutionTabs({ activeTab, setActiveTab }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {SOLUTIONS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border border-blue-200 bg-gradient-to-b from-white to-blue-50 text-slate-900 shadow-sm"
                : "bg-transparent text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}