import React, { useEffect, useMemo, useState } from "react";

const TEXT = {
  title: "코드 상세",
  modeEdit: "수정",
  modeCreate: "신규",
  requiredMessage: "코드유형아이디, 코드아이디, 코드명은 필수입니다.",
  groupCode: "코드유형아이디",
  code: "코드아이디",
  codeName: "코드명",
  active: "사용",
  new: "신규",
  save: "저장",
  saving: "저장 중...",
  dirty: "변경됨",
  reservedCodeMessage: "코드 00은 코드유형 정보 저장용 예약값입니다.",
};

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

function isFormDirty(form, initialForm) {
  return [
    "group_code",
    "code",
    "code_name",
    "code_value",
    "sort_order",
    "is_active",
    "description",
  ].some((field) => form[field] !== initialForm[field]);
}

export default function CodebookForm({
  initialValue = null,
  isSaving = false,
  onSubmit,
  onPrepareCreate,
  groupCodeOptions = [],
  reservedCode = "",
  reservedCodeMessage = TEXT.reservedCodeMessage,
}) {
  const [form, setForm] = useState(() => buildInitialFormValue(initialValue));
  const [errorMessage, setErrorMessage] = useState("");
  const isEditMode = Boolean(initialValue?.id);
  const initialForm = useMemo(
    () => buildInitialFormValue(initialValue),
    [initialValue]
  );
  const isDirty = isFormDirty(form, initialForm);

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
      setErrorMessage(TEXT.requiredMessage);
      return;
    }

    if (!isEditMode && reservedCode && form.code.trim() === reservedCode) {
      setErrorMessage(reservedCodeMessage);
      return;
    }

    setErrorMessage("");
    await onSubmit?.(normalizePayload(form));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            {TEXT.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
            선택 코드유형: {form.group_code || "-"}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
            {isEditMode ? TEXT.modeEdit : TEXT.modeCreate}
          </span>
          {isDirty && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
              {TEXT.dirty}
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      <datalist id="codebook-group-code-options">
        {groupCodeOptions.map((groupCode) => (
          <option key={groupCode} value={groupCode} />
        ))}
      </datalist>

      <div className="grid min-w-0 gap-2 md:grid-cols-[110px_minmax(0,1fr)_90px] md:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            {TEXT.code} *
          </span>
          <input
            value={form.code}
            onChange={(event) => updateField("code", event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving || isEditMode}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            {TEXT.codeName} *
          </span>
          <input
            value={form.code_name}
            onChange={(event) => updateField("code_name", event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isSaving}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            사용여부
          </span>
          <select
            value={form.is_active ? "true" : "false"}
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
          onClick={onPrepareCreate}
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          disabled={isSaving}
        >
          {TEXT.new}
        </button>
        <button
          type="submit"
          className="h-8 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isSaving || !isDirty}
        >
          {isSaving ? TEXT.saving : TEXT.save}
        </button>
      </div>
    </form>
  );
}
