import React from "react";
import { useEstimatorStore } from "../../../store/useEstimatorStore";
import {
  getComplexityOptions,
  getDifficultyOptions,
  getSolutionTabs,
} from "../../../shared/lib/estimatorMeta";
import { calcItemMd, fmt } from "../../../shared/lib/estimatorMath";
import ActionButton from "../../../shared/ui/ActionButton";
import SmallInput from "../../../shared/ui/SmallInput";
import SmallSelect from "../../../shared/ui/SmallSelect";

function Panel({ title, children, right }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
        {right}
      </div>
      <div className="flex flex-1 min-h-0 flex-col p-4">{children}</div>
    </div>
  );
}

function moveFocus(e, rowIndex, colIndex) {
  if (e.key !== "Enter") return;

  e.preventDefault();

  const next = document.querySelector(
    `[data-cell="${rowIndex + 1}-${colIndex}"]`
  );

  if (next) {
      next.focus();
    if (typeof next.select === "function") {
      next.select();
    }
  }
}

function handleAddItem() {
  addItem(activeTab);

  setTimeout(() => {
    const rows = document.querySelectorAll(`[data-row="${activeTab}"]`);
    const lastRow = rows[rows.length - 1];

    const firstInput = lastRow?.querySelector("input");

    if (firstInput) {
      firstInput.focus();
      firstInput.select?.();
    }
  }, 0);
}

export default function DetailTable({
  activeTab,
  currentItems,
  updateItem,
  addItem,
  removeItem,
}) {
  const codebooks = useEstimatorStore((s) => s.codebooks || []);
  const solutions = getSolutionTabs(codebooks);
  const difficultyOptions = getDifficultyOptions(codebooks);
  const complexityOptions = getComplexityOptions(codebooks);

  return (
    <Panel
      title="상세 업무 목록"
      right={
        <ActionButton primary onClick={() => addItem(activeTab)}>
          ＋ 항목 추가
        </ActionButton>
      }
    >
      <div className="mb-3 shrink-0 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        현재 탭:{" "}
        <span className="font-semibold text-slate-700">
          {solutions.find((s) => s.key === activeTab)?.label}
        </span>{" "}
        · 입력값을 변경하면 우측 요약과 상단 공수가 즉시 반영됩니다.
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-100">
        <table className="table-fixed min-w-full border-collapse bg-white">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
              <th className="w-[240px] py-3 pr-3 pl-4">업무 기능</th>
              <th className="w-[90px] py-3 pr-3 text-center">기본공수 (M/M)</th>
              <th className="w-[140px] py-3 pr-3 text-center">난이도</th>
              <th className="w-[140px] py-3 pr-3 text-center">복잡도</th>
              <th className="w-[90px] py-3 pr-3 text-right">산정공수 (M/M)</th>
              <th className="w-[220px] py-3 pr-3">비고</th>
              <th className="w-[60px] py-3 pr-4 text-center">삭제</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item, index) => (
              <tr
                key={`${activeTab}-${index}`}
                data-row={activeTab}
                className="border-b border-slate-100 align-top text-sm"
              >
                <td className="py-2 pr-3 pl-4">
                  <SmallInput
                    data-cell={`${index}-0`}
                    value={item.name}
                    onChange={(e) =>
                      updateItem(activeTab, index, "name", e.target.value)
                    }
                    onKeyDown={(e) => moveFocus(e, index, 0)}
                  />
                </td>

                <td className="py-2 pr-3">
                  <SmallInput
                    data-cell={`${index}-1`}
                    type="number"
                    step="0.01"
                    value={item.baseMd}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = parseFloat(raw || 0);
                      const fixed = Math.round(num * 100) / 100;

                      updateItem(activeTab, index, "baseMd", fixed);
                    }}
                    onKeyDown={(e) => moveFocus(e, index, 1)}
                    className="text-center font-semibold"
                  />
                </td>

                <td className="py-2 pr-3">
                  <SmallSelect
                    data-cell={`${index}-2`}
                    value={item.difficulty}
                    onChange={(e) =>
                      updateItem(
                        activeTab,
                        index,
                        "difficulty",
                        Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => moveFocus(e, index, 2)}
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
                    data-cell={`${index}-3`}
                    value={item.complexity}
                    onChange={(e) =>
                      updateItem(
                        activeTab,
                        index,
                        "complexity",
                        Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => moveFocus(e, index, 3)}
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
                    data-cell={`${index}-5`}
                    type="text"
                    value={item.note || ""}
                    onChange={(e) =>
                      updateItem(activeTab, index, "note", e.target.value)
                    }
                    onKeyDown={(e) => moveFocus(e, index, 5)}
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
