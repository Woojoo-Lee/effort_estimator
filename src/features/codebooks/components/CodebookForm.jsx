import React, { useEffect, useState } from "react";

const GROUP_CODE_OPTIONS = [
  "SOLUTION",
  "DIFFICULTY",
  "COMPLEXITY",
  "POLICY",
];

const EMPTY_FORM = {
  group_code: "",
  code: "",
  code_name: "",
  code_value: "",
  sort_order: "",
  is_active: true,
  description: "",
};

function buildInitialFormValue(initialValue) {
  if (!initialValue) {
    return EMPTY_FORM;
  }

  return {
    group_code: initialValue.group_code || "",
    code: initialValue.code || "",
    code_name: initialValue.code_name || "",
    code_value: initialValue.code_value || "",
    sort_order:
      initialValue.sort_order == null ? "" : String(initialValue.sort_order),
    is_active: initialValue.is_active !== false,
    description: initialValue.description || "",
  };
}

function normalizePayload(form) {
  const sortOrder = Number(form.sort_order);

  return {
    group_code: form.group_code.trim(),
    code: form.code.trim(),
    code_name: form.code_name.trim(),
    code_value: form.code_value.trim() || form.code.trim(),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: Boolean(form.is_active),
    description: form.description.trim() || null,
  };
}

export default function CodebookForm({
  initialValue = null,
  isSaving = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(() => buildInitialFormValue(initialValue));
  const [errorMessage, setErrorMessage] = useState("");
  const isEditMode = Boolean(initialValue?.id);

  useEffect(() => {
    setForm(buildInitialFormValue(initialValue));
    setErrorMessage("");
  }, [initialValue]);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.group_code.trim() || !form.code.trim() || !form.code_name.trim()) {
      setErrorMessage("그룹코드, 코드, 코드명은 필수입니다.");
      return;
    }

    setErrorMessage("");
    const result = await onSubmit?.(normalizePayload(form));

    if (result === false) {
      return;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            {isEditMode ? "코드 수정" : "코드 등록"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            공통 코드 정보를 입력합니다.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            그룹코드 *
          </span>
          <select
            value={form.group_code}
            onChange={(event) => updateField("group_code", event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          >
            <option value="">선택</option>
            {GROUP_CODE_OPTIONS.map((groupCode) => (
              <option key={groupCode} value={groupCode}>
                {groupCode}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            코드 *
          </span>
          <input
            value={form.code}
            onChange={(event) => updateField("code", event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            코드명 *
          </span>
          <input
            value={form.code_name}
            onChange={(event) => updateField("code_name", event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            코드값
          </span>
          <input
            value={form.code_value}
            onChange={(event) => updateField("code_value", event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            정렬순서
          </span>
          <input
            type="number"
            value={form.sort_order}
            onChange={(event) => updateField("sort_order", event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>

        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField("is_active", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
            disabled={isSaving}
          />
          <span className="text-sm font-bold text-slate-700">사용</span>
        </label>

        <label className="block md:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            설명
          </span>
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            className="min-h-[76px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          disabled={isSaving}
        >
          취소
        </button>
        <button
          type="submit"
          className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isSaving}
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
