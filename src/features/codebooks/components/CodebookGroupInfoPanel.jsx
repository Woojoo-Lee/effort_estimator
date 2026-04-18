import React from "react";

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-sm font-extrabold text-slate-900">{value}</span>
    </div>
  );
}

export default function CodebookGroupInfoPanel({ groupSummary }) {
  if (!groupSummary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        선택된 그룹이 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-extrabold text-slate-900">그룹 정보</h2>
        <p className="mt-1 text-xs text-slate-500">
          현재 common_code 구조에서는 그룹 상세 정보를 별도로 저장할 수
          없습니다.
        </p>
      </div>

      <div className="pt-3">
        <SummaryRow label="그룹코드" value={groupSummary.groupCode} />
        <SummaryRow label="전체 코드 수" value={groupSummary.totalCount} />
        <SummaryRow label="사용 코드 수" value={groupSummary.activeCount} />
        <SummaryRow label="미사용 코드 수" value={groupSummary.inactiveCount} />
        <SummaryRow
          label="최소 정렬순서"
          value={groupSummary.minSortOrder ?? "-"}
        />
        <SummaryRow
          label="최대 정렬순서"
          value={groupSummary.maxSortOrder ?? "-"}
        />
      </div>
    </div>
  );
}
