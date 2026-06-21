import React from "react";

export default function CodebookGroupInfoPanel({
  draft,
  mode = "create",
  isSaving = false,
  onChange,
  onPrepareCreate,
  onSave,
}) {
  const isCreateMode = mode === "create";

  const updateField = (field, value) => {
    onChange?.({
      ...draft,
      [field]: value,
    });
  };

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            코드유형 상세
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
          {isCreateMode ? "신규" : "수정"}
        </span>
      </div>

      <div className="grid min-w-0 gap-2 md:grid-cols-[140px_minmax(0,1fr)_90px] md:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            코드유형아이디
          </span>
          <input
            value={draft.group_code}
            onChange={(event) => updateField("group_code", event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            코드유형명
          </span>
          <input
            value={draft.group_name}
            onChange={(event) => updateField("group_name", event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            사용여부
          </span>
          <select
            value={draft.is_active === false ? "false" : "true"}
            onChange={(event) =>
              updateField("is_active", event.target.value === "true")
            }
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          >
            <option value="true">사용</option>
            <option value="false">미사용</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex justify-end gap-1.5 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => onPrepareCreate?.()}
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          disabled={isSaving}
        >
          신규
        </button>
        <button
          type="button"
          onClick={() => onSave?.()}
          className="h-8 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isSaving}
        >
          저장
        </button>
      </div>
    </section>
  );
}
