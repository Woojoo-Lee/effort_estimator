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

const TEXT = {
  baseEffortTitle: "\uAE30\uBCF8\uACF5\uC218",
  additionalEffortTitle: "\uCD94\uAC00\uACF5\uC218",
  statsItemListTitle: "\uCD94\uAC00\uACF5\uC218 \uD56D\uBAA9 \uBAA9\uB85D",
  dynamicFieldTitle: "\uCD94\uAC00\uACF5\uC218 \uC785\uB825",
  noBaseEffortMeta:
    "\uAE30\uBCF8\uACF5\uC218 \uBA54\uD0C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  dynamicFieldHelp:
    "\uD56D\uBAA9\uBCC4 \uC0B0\uC815\uC5D0 \uD544\uC694\uD55C \uAC12\uC744 \uC785\uB825\uD569\uB2C8\uB2E4.",
  phaseCode: "\uB2E8\uACC4\uCF54\uB4DC",
  baseMd: "\uAE30\uBCF8\uACF5\uC218(MD)",
  description: "\uC124\uBA85",
  required: "\uD544\uC218",
  emptyValue: "-",
};

const PHASE_LABELS = {
  ANALYSIS: "분석",
  DESIGN: "설계",
  DEV: "구현",
  BUILD: "구현",
  TEST: "테스트",
  STABILIZE: "안정화",
  STABILIZATION: "안정화",
};

function getPhaseLabel(phaseCode) {
  return PHASE_LABELS[phaseCode] || phaseCode || TEXT.emptyValue;
}

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

function BaseEffortSection({ rows }) {
  return (
    <section className="mb-4 shrink-0">
      <h4 className="mb-2 text-sm font-extrabold text-slate-900">
        {TEXT.baseEffortTitle}
      </h4>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          {TEXT.noBaseEffortMeta}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3">{TEXT.phaseCode}</th>
                <th className="px-4 py-3 text-right">{TEXT.baseMd}</th>
                <th className="px-4 py-3">{TEXT.description}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.solution_code}-${row.phase_code}`}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-4 py-3 font-bold text-slate-800">
                    {getPhaseLabel(row.phase_code)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    {fmt(row.base_md)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {row.description || TEXT.emptyValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function getDynamicFieldValue(item, field) {
  return item[field.field_key] ?? field.default_value ?? "";
}

function DynamicFieldInput({ field, item, onChange }) {
  const value = getDynamicFieldValue(item, field);

  if (field.field_type === "boolean") {
    const checked =
      typeof value === "boolean" ? value : String(value).toLowerCase() === "true";

    return (
      <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        {checked ? "true" : "false"}
      </label>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[72px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
      />
    );
  }

  return (
    <SmallInput
      type={field.field_type === "number" ? "number" : "text"}
      value={value}
      onChange={(event) => {
        if (field.field_type === "number") {
          const num = Number(event.target.value || 0);
          onChange(Number.isFinite(num) ? num : 0);
          return;
        }

        onChange(event.target.value);
      }}
      className="bg-white text-slate-600"
    />
  );
}

function DynamicFieldSection({ rows, items, activeTab, updateItem }) {
  return (
    <section className="mb-4 shrink-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-slate-900">
          {TEXT.dynamicFieldTitle}
        </h4>
        <span className="text-xs font-semibold text-slate-400">
          {TEXT.dynamicFieldHelp}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const itemCode = item.item_code || item.itemCode;
          const itemFields = rows.filter((field) => field.item_code === itemCode);

          return (
            <div
              key={`${activeTab}-dynamic-${index}`}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
            >
              <div className="mb-3 truncate text-sm font-extrabold text-slate-800">
                {item.name || `${activeTab} #${index + 1}`}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {itemFields.map((field) => (
                  <div key={`${index}-${field.item_code}-${field.field_key}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-slate-500">
                        {field.field_name || field.field_key}
                      </span>
                      {field.is_required && (
                        <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                          {TEXT.required}
                        </span>
                      )}
                    </div>
                    <DynamicFieldInput
                      field={field}
                      item={item}
                      onChange={(nextValue) =>
                        updateItem(activeTab, index, field.field_key, nextValue)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function DetailTable({
  activeTab,
  currentItems,
  updateItem,
  addItem,
  removeItem,
  baseEffortMetaRows = [],
  itemFieldMetaRows = [],
}) {
  const codebooks = useEstimatorStore((s) => s.codebooks || []);
  const solutions = getSolutionTabs(codebooks);
  const difficultyOptions = getDifficultyOptions(codebooks);
  const complexityOptions = getComplexityOptions(codebooks);
  const activeBaseEffortRows = baseEffortMetaRows.filter(
    (row) => row.solution_code === activeTab && row.is_active !== false
  );
  const activeItemFieldRows = itemFieldMetaRows.filter(
    (row) => row.solution_code === activeTab && row.is_active !== false
  );
  const isStatsTab = activeTab === "stats";
  const shouldShowDynamicFields =
    isStatsTab && activeItemFieldRows.length > 0;
  const shouldShowLegacyDifficultyColumns = !isStatsTab;
  const shouldShowLegacyCalcColumn = !isStatsTab;

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

      <BaseEffortSection rows={activeBaseEffortRows} />

      {!shouldShowDynamicFields && (
        <h4 className="mb-2 shrink-0 text-sm font-extrabold text-slate-900">
          {TEXT.additionalEffortTitle}
        </h4>
      )}

      {shouldShowDynamicFields && (
        <DynamicFieldSection
          rows={activeItemFieldRows}
          items={currentItems}
          activeTab={activeTab}
          updateItem={updateItem}
        />
      )}

      {!isStatsTab && (
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-100">
        <table className="table-fixed min-w-full border-collapse bg-white">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
              <th className="w-[240px] py-3 pr-3 pl-4">업무 기능</th>
              <th className="w-[90px] py-3 pr-3 text-center">기본공수 (M/M)</th>
              {isStatsTab && (
                <th className="w-[90px] py-3 pr-3 text-center">수량</th>
              )}
              {shouldShowLegacyDifficultyColumns && (
                <>
                  <th className="w-[140px] py-3 pr-3 text-center">난이도</th>
                  <th className="w-[140px] py-3 pr-3 text-center">복잡도</th>
                </>
              )}
              {shouldShowLegacyCalcColumn && (
                <th className="w-[90px] py-3 pr-3 text-right">
                  산정공수 (M/M)
                </th>
              )}
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

                {isStatsTab && (
                  <td className="py-2 pr-3">
                    <SmallInput
                      data-cell={`${index}-2`}
                      type="number"
                      step="1"
                      value={item.quantity ?? 1}
                      onChange={(e) => {
                        const quantity = Number(e.target.value || 0);

                        updateItem(
                          activeTab,
                          index,
                          "quantity",
                          Number.isFinite(quantity) ? quantity : 0
                        );
                      }}
                      onKeyDown={(e) => moveFocus(e, index, 2)}
                      className="text-center font-semibold"
                    />
                  </td>
                )}

                {shouldShowLegacyDifficultyColumns && (
                  <>
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
                  </>
                )}

                {shouldShowLegacyCalcColumn && (
                  <td className="py-2 pr-3 text-right align-middle">
                    <div className="rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-600">
                      {fmt(calcItemMd(item))}
                    </div>
                  </td>
                )}

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
      )}
    </Panel>
  );
}
