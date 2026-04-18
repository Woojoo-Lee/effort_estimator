import React from "react";

const TEXT = {
  loading: "\uD56D\uBAA9 \uBA54\uD0C0 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.",
  empty: "\uD45C\uC2DC\uD560 \uD56D\uBAA9 \uBA54\uD0C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  itemCode: "\uD56D\uBAA9\uCF54\uB4DC",
  itemName: "\uD56D\uBAA9\uBA85",
  baseMd: "\uAE30\uBCF8 MD",
  difficulty: "\uB09C\uC774\uB3C4",
  complexity: "\uBCF5\uC7A1\uB3C4",
  active: "\uC0AC\uC6A9 \uC5EC\uBD80",
  activeValue: "\uC0AC\uC6A9",
  inactiveValue: "\uBBF8\uC0AC\uC6A9",
  emptyValue: "-",
};

function formatValue(value) {
  return value ?? TEXT.emptyValue;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return TEXT.emptyValue;
  }

  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : value;
}

export default function ItemMetaTable({
  rows = [],
  selectedItemId = null,
  isBusy = false,
  onSelectItem,
}) {
  if (isBusy) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.loading}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{TEXT.itemCode}</th>
              <th className="px-4 py-3">{TEXT.itemName}</th>
              <th className="px-4 py-3 text-right">{TEXT.baseMd}</th>
              <th className="px-4 py-3 text-right">{TEXT.difficulty}</th>
              <th className="px-4 py-3 text-right">{TEXT.complexity}</th>
              <th className="px-4 py-3">{TEXT.active}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isSelected = selectedItemId === row.id;

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectItem?.(row)}
                  className={`cursor-pointer transition ${
                    isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800">
                    {formatValue(row.item_code)}
                  </td>
                  <td className="min-w-[180px] px-4 py-3 font-semibold text-slate-700">
                    {formatValue(row.item_name)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600">
                    {formatNumber(row.default_base_md)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600">
                    {formatNumber(row.default_difficulty)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600">
                    {formatNumber(row.default_complexity)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
                        row.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.is_active ? TEXT.activeValue : TEXT.inactiveValue}
                    </span>
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
