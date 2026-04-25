import React from "react";

import ActionButton from "../../../shared/ui/ActionButton";
import SmallInput from "../../../shared/ui/SmallInput";

export default function ProjectForm({
  draftProjectName,
  setDraftProjectName,
  createProjectFromDraft,
  disabled = false,
}) {
  async function handleSubmit(event) {
    event.preventDefault();
    await createProjectFromDraft();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-end"
    >
      <label className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-bold text-slate-500">
          ?꾨줈?앺듃紐?        </span>
        <SmallInput
          value={draftProjectName}
          onChange={(event) => setDraftProjectName(event.target.value)}
          placeholder="새 프로젝트명을 입력하세요"
          disabled={disabled}
          className="font-semibold text-slate-800"
        />
      </label>

      <ActionButton
        primary
        type="submit"
        disabled={disabled || !draftProjectName.trim()}
        className="h-10 shrink-0"
      >
        {disabled ? "생성 중..." : "프로젝트 생성"}
      </ActionButton>
    </form>
  );
}
