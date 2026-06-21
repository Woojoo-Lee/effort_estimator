import React from "react";

export default function CodebookTable({
  rows = [],
  isBusy = false,
  isSaving = false,
  selectedRowId = null,
  onEdit,
}) {
  if (isBusy) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
        코드 목록을 불러오는 중입니다.
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2">
        <h2 className="text-sm font-extrabold text-slate-900">코드목록</h2>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm font-semibold text-slate-500">
            등록된 코드가 없습니다. 하단 코드 상세에서 신규 코드를 입력하세요.
          </p>
        </div>
      ) : (
        <div className="min-h-[420px] max-h-[520px] overflow-auto">
          <table className="min-w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-12" />
              <col className="w-28" />
              <col />
              <col className="w-20" />
            </colgroup>
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-2 text-center">번호</th>
                <th className="px-3 py-2 text-center">코드아이디</th>
                <th className="px-3 py-2 text-left">코드명</th>
                <th className="px-3 py-2 text-center">사용여부</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isSelected = selectedRowId === row.id;

                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      if (!isSaving) {
                        onEdit?.(row);
                      }
                    }}
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
                      {row.code}
                    </td>
                    <td className="px-2 py-2 text-left font-semibold">
                      {row.code_name}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {row.is_active === false ? "미사용" : "사용"}
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
