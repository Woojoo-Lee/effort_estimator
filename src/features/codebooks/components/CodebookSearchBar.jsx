import React from "react";

export default function CodebookSearchBar({
  searchText,
  onSearchTextChange,
  activeFilter,
  onActiveFilterChange,
  onRefresh,
  onCreateCode,
  isBusy = false,
  isSaving = false,
}) {
  const isDisabled = isBusy || isSaving;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            코드북 관리
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            공통 코드를 조회하고 선택 그룹의 코드를 관리합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">
              검색어
            </span>
            <input
              value={searchText}
              onChange={(event) => onSearchTextChange?.(event.target.value)}
              placeholder="코드, 코드명, 설명 검색"
              className="h-10 w-full min-w-[240px] rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              disabled={isDisabled}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">
              사용 여부
            </span>
            <select
              value={activeFilter}
              onChange={(event) => onActiveFilterChange?.(event.target.value)}
              className="h-10 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              disabled={isDisabled}
            >
              <option value="ALL">전체</option>
              <option value="ACTIVE">사용</option>
              <option value="INACTIVE">미사용</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDisabled}
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={onCreateCode}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isDisabled}
            >
              코드 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
