import React from "react";

const TEXT = {
  loading: "\uCF54\uB4DC\uBD81 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.",
  empty: "\uD45C\uC2DC\uD560 \uCF54\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  groupCode: "\uADF8\uB8F9\uCF54\uB4DC",
  code: "\uCF54\uB4DC",
  codeName: "\uCF54\uB4DC\uBA85",
  codeValue: "\uCF54\uB4DC\uAC12",
  sortOrder: "\uC815\uB82C\uC21C\uC11C",
  active: "\uC0AC\uC6A9 \uC5EC\uBD80",
  description: "\uC124\uBA85",
  actions: "\uAD00\uB9AC",
  activeValue: "\uC0AC\uC6A9",
  inactiveValue: "\uBBF8\uC0AC\uC6A9",
  edit: "\uC218\uC815",
  enable: "\uC0AC\uC6A9",
  disable: "\uBBF8\uC0AC\uC6A9",
};

function ActiveBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive ? TEXT.activeValue : TEXT.inactiveValue}
    </span>
  );
}

export default function CodebookTable({
  rows = [],
  isBusy = false,
  isSaving = false,
  selectedRowId = null,
  showGroupCode = true,
  onEdit,
  onToggleActive,
}) {
  if (isBusy) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.loading}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
              {showGroupCode && <th className="px-4 py-3">{TEXT.groupCode}</th>}
              <th className="px-4 py-3">{TEXT.code}</th>
              <th className="px-4 py-3">{TEXT.codeName}</th>
              <th className="px-4 py-3">{TEXT.codeValue}</th>
              <th className="px-4 py-3 text-right">{TEXT.sortOrder}</th>
              <th className="px-4 py-3 text-center">{TEXT.active}</th>
              <th className="px-4 py-3">{TEXT.description}</th>
              <th className="px-4 py-3 text-center">{TEXT.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selectedRowId === row.id;

              return (
                <tr
                  key={row.id}
                  onClick={() => {
                    if (!isSaving) {
                      onEdit?.(row);
                    }
                  }}
                  className={`border-b border-slate-100 text-sm text-slate-700 last:border-b-0 ${
                    isSelected ? "bg-blue-50/70" : ""
                  } ${
                    isSaving
                      ? "opacity-80"
                      : "cursor-pointer transition hover:bg-slate-50 active:bg-blue-50"
                  }`}
                >
                  {showGroupCode && (
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {row.group_code}
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {row.code}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.code_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {row.code_value || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.sort_order ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActiveBadge isActive={row.is_active} />
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-slate-500">
                    <span className="line-clamp-2">
                      {row.description || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          if (!isSaving) {
                            onEdit?.(row);
                          }
                        }}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving}
                      >
                        {TEXT.edit}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          if (!isSaving) {
                            onToggleActive?.(row, !row.is_active);
                          }
                        }}
                        className={`h-8 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          row.is_active
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                        disabled={isSaving}
                      >
                        {row.is_active ? TEXT.disable : TEXT.enable}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
