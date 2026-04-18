import React from "react";

function ActiveBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
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
        Loading codebook rows...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
        No codebook rows found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
              {showGroupCode && <th className="px-4 py-3">group_code</th>}
              <th className="px-4 py-3">code</th>
              <th className="px-4 py-3">code_name</th>
              <th className="px-4 py-3">code_value</th>
              <th className="px-4 py-3 text-right">sort_order</th>
              <th className="px-4 py-3 text-center">is_active</th>
              <th className="px-4 py-3">description</th>
              <th className="px-4 py-3 text-center">actions</th>
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
                        Edit
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
                        {row.is_active ? "Disable" : "Enable"}
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
