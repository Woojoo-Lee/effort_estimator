import React, { useEffect, useState } from "react";

const SEARCH_FIELDS = [
  { value: "group_code", label: "코드유형아이디" },
  { value: "code", label: "코드아이디" },
  { value: "code_name", label: "코드명" },
];

export default function CodebookSearchBar({
  groupCodeOptions = [],
  filters,
  onApplyFilters,
  onResetFilters,
  onRefresh,
  isBusy = false,
  isSaving = false,
}) {
  const [draft, setDraft] = useState(filters);
  const isDisabled = isBusy || isSaving;

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const updateDraft = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    onApplyFilters?.(draft);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(180px,1.4fr)_minmax(110px,0.7fr)_auto] lg:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            코드분류
          </span>
          <select
            value={draft.groupCode}
            onChange={(event) => updateDraft("groupCode", event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isDisabled}
          >
            <option value="ALL">전체</option>
            {groupCodeOptions.map((groupCode) => (
              <option key={groupCode} value={groupCode}>
                {groupCode}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            조회조건
          </span>
          <select
            value={draft.searchField}
            onChange={(event) => updateDraft("searchField", event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isDisabled}
          >
            {SEARCH_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            검색어
          </span>
          <input
            value={draft.searchText}
            onChange={(event) => updateDraft("searchText", event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색어 입력"
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isDisabled}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            사용여부
          </span>
          <select
            value={draft.activeFilter}
            onChange={(event) =>
              updateDraft("activeFilter", event.target.value)
            }
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isDisabled}
          >
            <option value="ALL">전체</option>
            <option value="ACTIVE">사용</option>
            <option value="INACTIVE">미사용</option>
          </select>
        </label>

        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={applyFilters}
            className="h-8 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={isDisabled}
          >
            조회
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
          >
            새로고침
          </button>
        </div>
      </div>
    </section>
  );
}
