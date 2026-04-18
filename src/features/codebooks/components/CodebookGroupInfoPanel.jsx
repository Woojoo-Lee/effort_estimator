import React from "react";

const TEXT = {
  empty: "\uC120\uD0DD\uB41C \uADF8\uB8F9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  title: "\uADF8\uB8F9 \uC694\uC57D",
  subtitle:
    "\uD604\uC7AC common_code \uAD6C\uC870\uC5D0\uC11C\uB294 \uADF8\uB8F9 \uC0C1\uC138 \uC815\uBCF4\uB97C \uBCC4\uB3C4\uB85C \uC800\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  groupCode: "\uADF8\uB8F9\uCF54\uB4DC",
  totalCount: "\uC804\uCCB4 \uCF54\uB4DC \uC218",
  activeCount: "\uC0AC\uC6A9 \uCF54\uB4DC \uC218",
  inactiveCount: "\uBBF8\uC0AC\uC6A9 \uCF54\uB4DC \uC218",
  minSortOrder: "\uCD5C\uC18C \uC815\uB82C\uC21C\uC11C",
  maxSortOrder: "\uCD5C\uB300 \uC815\uB82C\uC21C\uC11C",
  emptyValue: "-",
};

function formatValue(value) {
  return value ?? TEXT.emptyValue;
}

export default function CodebookGroupInfoPanel({ groupSummary }) {
  if (!groupSummary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.empty}
      </div>
    );
  }

  const items = [
    {
      label: TEXT.groupCode,
      value: formatValue(groupSummary.groupCode),
    },
    {
      label: TEXT.totalCount,
      value: formatValue(groupSummary.totalCount),
    },
    {
      label: TEXT.activeCount,
      value: formatValue(groupSummary.activeCount),
    },
    {
      label: TEXT.inactiveCount,
      value: formatValue(groupSummary.inactiveCount),
    },
    {
      label: TEXT.minSortOrder,
      value: formatValue(groupSummary.minSortOrder),
    },
    {
      label: TEXT.maxSortOrder,
      value: formatValue(groupSummary.maxSortOrder),
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
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <dt className="text-xs font-bold text-slate-500">{item.label}</dt>
            <dd className="mt-1 break-words text-sm font-extrabold text-slate-800">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
