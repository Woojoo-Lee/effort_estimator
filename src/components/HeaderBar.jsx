import React from "react";
import { BRAND } from "../utils/constants";
import ActionButton from "./ui/ActionButton";
import SmallInput from "./ui/SmallInput";

function StatusPill({ children, tone = "blue" }) {
  const classes =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}>
      {children}
    </span>
  );
}

function SavePill({ savedAt }) {
  return (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      최근 저장 {savedAt || "없음"}
    </span>
  );
}

export default function HeaderBar({
  projectId,
  projectName,
  setProjectName,
  savedAt,
  isDirty,
  dbReady,
  isBusy,
  createNewProject,
  handleSaveProject,
  importJson,
  downloadJson,
  downloadExcel,
  resetAll,
  showPrint,
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl text-white shadow-sm">
            📘
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[30px] font-extrabold tracking-tight text-slate-900">
                {BRAND.title}
              </div>
              <StatusPill>{BRAND.version}</StatusPill>
              <SavePill savedAt={savedAt} />
              {projectId ? (
                <StatusPill tone="emerald">DB 저장 프로젝트</StatusPill>
              ) : (
                <StatusPill tone="amber">미저장 신규 프로젝트</StatusPill>
              )}
              {isDirty ? (
                <StatusPill tone="amber">저장되지 않은 변경 있음</StatusPill>
              ) : (
                <StatusPill tone="emerald">저장 상태 최신</StatusPill>
              )}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">{BRAND.subtitle}</div>
            <div className="mt-1 text-sm text-slate-400">{BRAND.updatedAt}</div>
            {!dbReady ? (
              <div className="mt-1 text-xs font-semibold text-red-500">
                Supabase 연결 정보가 없어서 DB 기능이 비활성화되었습니다.
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SmallInput
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-[260px] bg-slate-50"
          />
          <ActionButton onClick={createNewProject}>새 프로젝트</ActionButton>
          <ActionButton
            primary
            onClick={handleSaveProject}
            disabled={!dbReady || isBusy}
          >
            {projectId ? "DB 업데이트" : "DB 저장"}
          </ActionButton>

          <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            JSON 불러오기
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={importJson}
            />
          </label>

          <ActionButton onClick={downloadJson}>JSON 저장</ActionButton>
          <ActionButton onClick={downloadExcel}>엑셀 저장</ActionButton>
          <ActionButton onClick={resetAll}>초기화</ActionButton>
          <ActionButton onClick={showPrint}>PDF / 인쇄</ActionButton>
        </div>
      </div>
    </div>
  );
}