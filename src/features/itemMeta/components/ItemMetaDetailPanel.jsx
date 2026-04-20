import React from "react";

const TEXT = {
  empty: "\uC120\uD0DD\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  title: "\uD56D\uBAA9 \uC0C1\uC138",
  subtitle:
    "\uC120\uD0DD\uB41C \uD56D\uBAA9 \uBA54\uD0C0\uC758 \uC0C1\uC138 \uC815\uBCF4\uC785\uB2C8\uB2E4.",
  solutionCode: "\uC194\uB8E8\uC158\uCF54\uB4DC",
  itemCode: "\uD56D\uBAA9\uCF54\uB4DC",
  itemName: "\uD56D\uBAA9\uBA85",
  baseMd: "\uAE30\uBCF8 MD",
  active: "\uC0AC\uC6A9 \uC5EC\uBD80",
  note: "\uC124\uBA85",
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

export default function ItemMetaDetailPanel({ item }) {
  if (!item) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.empty}
      </div>
    );
  }

  const note = item.description || item.default_note || TEXT.emptyValue;
  const items = [
    {
      label: TEXT.solutionCode,
      value: formatValue(item.solution_code),
    },
    {
      label: TEXT.itemCode,
      value: formatValue(item.item_code),
    },
    {
      label: TEXT.itemName,
      value: formatValue(item.item_name),
    },
    {
      label: TEXT.baseMd,
      value: formatNumber(item.default_base_md),
    },
    {
      label: TEXT.active,
      value: item.is_active ? TEXT.activeValue : TEXT.inactiveValue,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-extrabold text-slate-900">
          {TEXT.title}
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {TEXT.subtitle}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((detail) => (
          <div
            key={detail.label}
            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <dt className="text-xs font-bold text-slate-500">
              {detail.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-extrabold text-slate-800">
              {detail.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
        <div className="text-xs font-bold text-slate-500">{TEXT.note}</div>
        <div className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-700">
          {note}
        </div>
      </div>
    </div>
  );
}
