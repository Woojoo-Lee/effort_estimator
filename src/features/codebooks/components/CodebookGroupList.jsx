import React from "react";

export default function CodebookGroupList({
  groups = [],
  selectedGroupCode = "",
  onSelectGroup,
  isBusy = false,
}) {
  if (isBusy) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        코드유형 목록을 불러오는 중입니다.
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2">
        <h2 className="text-sm font-extrabold text-slate-900">
          코드유형목록
        </h2>
      </div>

      {groups.length === 0 ? (
        <div className="p-6 text-center text-sm font-semibold text-slate-500">
          등록된 코드유형이 없습니다.
        </div>
      ) : (
        <div className="min-h-[420px] max-h-[520px] overflow-auto">
          <table className="min-w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-12" />
              <col className="w-32" />
              <col />
              <col className="w-20" />
            </colgroup>
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-2 text-center">번호</th>
                <th className="px-3 py-2 text-center">코드유형아이디</th>
                <th className="px-3 py-2 text-left">코드유형명</th>
                <th className="px-3 py-2 text-center">사용여부</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => {
                const isSelected = selectedGroupCode === group.groupCode;

                return (
                  <tr
                    key={group.groupCode}
                    onClick={() => onSelectGroup?.(group.groupCode)}
                    className={`cursor-pointer border-b border-slate-100 last:border-b-0 ${
                      isSelected
                        ? "bg-blue-50 text-blue-800"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-1.5 py-2 text-center font-semibold">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-xs">
                      {group.groupCode}
                    </td>
                    <td className="px-2 py-2 text-left">
                      {group.typeName || group.groupCode}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {group.isActive === false ? "미사용" : "사용"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
