import React from "react";
import { SOLUTIONS, difficultyOptions, complexityOptions } from "../utils/constants";
import { calcItemMd, fmt } from "../utils/estimatorMath";
import ActionButton from "./ui/ActionButton";
import SmallInput from "./ui/SmallInput";
import SmallSelect from "./ui/SmallSelect";

function Panel({ title, children, right }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DetailTable({
  activeTab,
  currentItems,
  updateItem,
  addItem,
  removeItem,
}) {
  return (
    <Panel
      title="상세 업무 목록"
      right={<ActionButton primary onClick={() => addItem(activeTab)}>＋ 항목 추가</ActionButton>}
    >
      <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        현재 탭:{" "}
        <span className="font-semibold text-slate-700">
          {SOLUTIONS.find((s) => s.key === activeTab)?.label}
        </span>{" "}
        · 입력값을 변경하면 우측 요약과 상단 공수가 즉시 반영됩니다.
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="min-w-full border-collapse bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
              <th className="py-3 pr-3 pl-4">업무 기능</th>
              <th className="py-3 pr-3 text-center">기본공수(MD)</th>
              <th className="py-3 pr-3 text-center">난이도</th>
              <th className="py-3 pr-3 text-center">복잡도</th>
              <th className="py-3 pr-3 text-right">산정공수</th>
              <th className="py-3 pr-3">비고</th>
              <th className="py-3 pr-4 text-center">삭제</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr
                key={`${activeTab}-${index}`}
                className="border-b border-slate-100 align-top text-sm"
              >
                <td className="py-2 pr-3 pl-4">
                  <SmallInput
                    value={item.name}
                    onChange={(e) => updateItem(activeTab, index, "name", e.target.value)}
                  />
                </td>
                <td className="py-2 pr-3">
                  <SmallInput
                    type="number"
                    step="0.1"
                    value={item.baseMd}
                    onChange={(e) =>
                      updateItem(activeTab, index, "baseMd", Number(e.target.value || 0))
                    }
                    className="text-center font-semibold"
                  />
                </td>
                <td className="py-2 pr-3">
                  <SmallSelect
                    value={item.difficulty}
                    onChange={(e) =>
                      updateItem(activeTab, index, "difficulty", Number(e.target.value))
                    }
                  >
                    {difficultyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SmallSelect>
                </td>
                <td className="py-2 pr-3">
                  <SmallSelect
                    value={item.complexity}
                    onChange={(e) =>
                      updateItem(activeTab, index, "complexity", Number(e.target.value))
                    }
                  >
                    {complexityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SmallSelect>
                </td>
                <td className="py-2 pr-3 text-right align-middle">
                  <div className="rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-600">
                    {fmt(calcItemMd(item))}
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <SmallInput
                    value={item.note}
                    onChange={(e) => updateItem(activeTab, index, "note", e.target.value)}
                    placeholder="비고 입력"
                  />
                </td>
                <td className="py-2 pr-4 text-center">
                  <button
                    onClick={() => removeItem(activeTab, index)}
                    className="rounded-lg px-2 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}