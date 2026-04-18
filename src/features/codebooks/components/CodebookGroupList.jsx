import React from "react";

export default function CodebookGroupList({
  groups = [],
  selectedGroupCode = "",
  onSelectGroup,
  isBusy = false,
}) {
  if (isBusy) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        그룹 목록을 불러오는 중입니다.
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        표시할 그룹이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-extrabold text-slate-900">그룹 목록</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {groups.map((group) => {
          const isSelected = selectedGroupCode === group.groupCode;

          return (
            <button
              key={group.groupCode}
              type="button"
              onClick={() => onSelectGroup?.(group.groupCode)}
              className={`block w-full px-4 py-3 text-left transition ${
                isSelected
                  ? "bg-blue-50 text-blue-700"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold">
                    {group.groupCode}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    사용 {group.activeCount} / 미사용 {group.inactiveCount}
                  </div>
                </div>
                <div
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${
                    isSelected
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {group.totalCount}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
