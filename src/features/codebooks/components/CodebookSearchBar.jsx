import React from "react";

const TEXT = {
  title: "\uCF54\uB4DC\uBD81 \uAD00\uB9AC",
  subtitle:
    "\uACF5\uD1B5 \uCF54\uB4DC\uB97C \uC870\uD68C\uD558\uACE0 \uC120\uD0DD \uADF8\uB8F9\uC758 \uCF54\uB4DC\uB97C \uAD00\uB9AC\uD569\uB2C8\uB2E4.",
  search: "\uAC80\uC0C9\uC5B4",
  searchPlaceholder:
    "\uCF54\uB4DC, \uCF54\uB4DC\uBA85, \uC124\uBA85 \uAC80\uC0C9",
  status: "\uC0AC\uC6A9 \uC5EC\uBD80",
  all: "\uC804\uCCB4",
  active: "\uC0AC\uC6A9",
  inactive: "\uBBF8\uC0AC\uC6A9",
  refresh: "\uC0C8\uB85C\uACE0\uCE68",
  createCode: "\uCF54\uB4DC \uB4F1\uB85D",
};

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
              disabled={isDisabled}
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
              disabled={isDisabled}
            >
              <option value="ALL">{TEXT.all}</option>
              <option value="ACTIVE">{TEXT.active}</option>
              <option value="INACTIVE">{TEXT.inactive}</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDisabled}
            >
              {TEXT.refresh}
            </button>
            <button
              type="button"
              onClick={onCreateCode}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isDisabled}
            >
              {TEXT.createCode}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
