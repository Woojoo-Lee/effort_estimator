import React from "react";

const TEXT = {
  title: "\uD56D\uBAA9 \uBA54\uD0C0 \uAD00\uB9AC",
  subtitle:
    "\uC194\uB8E8\uC158\uBCC4 \uD56D\uBAA9 \uBA54\uD0C0\uB97C \uC870\uD68C\uD558\uACE0 \uAE30\uBCF8 \uC0B0\uC815\uAC12\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.",
  search: "\uAC80\uC0C9\uC5B4",
  searchPlaceholder:
    "\uD56D\uBAA9\uCF54\uB4DC, \uD56D\uBAA9\uBA85 \uAC80\uC0C9",
  status: "\uC0AC\uC6A9 \uC5EC\uBD80",
  all: "\uC804\uCCB4",
  active: "\uC0AC\uC6A9",
  inactive: "\uBBF8\uC0AC\uC6A9",
  refresh: "\uC0C8\uB85C\uACE0\uCE68",
};

export default function ItemMetaSearchBar({
  searchText,
  onSearchTextChange,
  activeFilter,
  onActiveFilterChange,
  onRefresh,
  isBusy = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {TEXT.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{TEXT.subtitle}</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">
              {TEXT.search}
            </span>
            <input
              value={searchText}
              onChange={(event) => onSearchTextChange?.(event.target.value)}
              placeholder={TEXT.searchPlaceholder}
              className="h-10 w-full min-w-[240px] rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              disabled={isBusy}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">
              {TEXT.status}
            </span>
            <select
              value={activeFilter}
              onChange={(event) => onActiveFilterChange?.(event.target.value)}
              className="h-10 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              disabled={isBusy}
            >
              <option value="ALL">{TEXT.all}</option>
              <option value="ACTIVE">{TEXT.active}</option>
              <option value="INACTIVE">{TEXT.inactive}</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onRefresh}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
          >
            {TEXT.refresh}
          </button>
        </div>
      </div>
    </div>
  );
}
