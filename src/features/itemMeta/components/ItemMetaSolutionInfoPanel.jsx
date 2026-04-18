import React from "react";

const TEXT = {
  empty: "\uC120\uD0DD\uB41C \uC194\uB8E8\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  title: "\uC194\uB8E8\uC158 \uC694\uC57D",
  subtitle:
    "\uC120\uD0DD\uB41C \uC194\uB8E8\uC158\uC758 \uD56D\uBAA9 \uBA54\uD0C0 \uC9D1\uACC4\uC785\uB2C8\uB2E4.",
  solutionCode: "\uC194\uB8E8\uC158\uCF54\uB4DC",
  totalCount: "\uC804\uCCB4 \uD56D\uBAA9 \uC218",
  activeCount: "\uC0AC\uC6A9 \uD56D\uBAA9 \uC218",
  inactiveCount: "\uBBF8\uC0AC\uC6A9 \uD56D\uBAA9 \uC218",
  baseMdTotal: "\uAE30\uBCF8MD \uD569\uACC4",
  emptyValue: "-",
};

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : value;
}

export default function ItemMetaSolutionInfoPanel({ solutionSummary }) {
  if (!solutionSummary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {TEXT.empty}
      </div>
    );
  }

  const items = [
    {
      label: TEXT.solutionCode,
      value: solutionSummary.solutionCode || solutionSummary.solution_code || TEXT.emptyValue,
    },
    {
      label: TEXT.totalCount,
      value: formatNumber(solutionSummary.totalCount),
    },
    {
      label: TEXT.activeCount,
      value: formatNumber(solutionSummary.activeCount),
    },
    {
      label: TEXT.inactiveCount,
      value: formatNumber(solutionSummary.inactiveCount),
    },
    {
      label: TEXT.baseMdTotal,
      value: formatNumber(solutionSummary.baseMdTotal),
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
            <dd className="mt-1 text-sm font-extrabold text-slate-800">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
