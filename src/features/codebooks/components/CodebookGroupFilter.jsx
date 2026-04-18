import React from "react";

const GROUP_FILTER_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "SOLUTION", label: "SOLUTION" },
  { value: "DIFFICULTY", label: "DIFFICULTY" },
  { value: "COMPLEXITY", label: "COMPLEXITY" },
  { value: "POLICY", label: "POLICY" },
];

export default function CodebookGroupFilter({
  selectedGroupCode,
  onChange,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">
        그룹 필터
      </span>
      <select
        value={selectedGroupCode}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-10 min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {GROUP_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
