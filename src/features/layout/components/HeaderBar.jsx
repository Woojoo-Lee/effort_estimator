import React from "react";

function StatusBadge({ children, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled = false,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function AccentButton({
  children,
  onClick,
  disabled = false,
  tone = "blue",
}) {
  const toneClass = {
    blue: "bg-blue-600 hover:bg-blue-700",
    violet: "bg-violet-600 hover:bg-violet-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-10 rounded-lg px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass[tone]}`}
    >
      {children}
    </button>
  );
}

export default function HeaderBar({
  projectMeta,
  status,
  actions,
}) {
  const { projectId, projectName, savedAt } = projectMeta;
  const { dbReady, isBusy, saveStatus } = status;

  const {
    setProjectName,
    createNewProject,
    handleSaveProject,
    downloadExcel,
    resetAll,
    showPrint,
    openVersionHistory,
  } = actions;

  return (
    <div className="flex flex-col gap-4 rounded-t-2xl border border-slate-200 border-b-0 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            컨택센터 공수 산정
          </h1>

          <div className="mt-1 text-xs text-slate-400">
            {projectId ? `ID: ${projectId}` : "신규 프로젝트"}
            {savedAt && ` · 저장일: ${savedAt}`}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!dbReady && <StatusBadge tone="red">DB 미연결</StatusBadge>}
          {saveStatus === "dirty" && <StatusBadge tone="amber">수정됨</StatusBadge>}
          {saveStatus === "saving" && <StatusBadge tone="blue">저장 중...</StatusBadge>}
          {saveStatus === "saved" && <StatusBadge tone="emerald">저장됨</StatusBadge>}
          {saveStatus === "error" && <StatusBadge tone="red">저장 실패</StatusBadge>}
          {isBusy && <StatusBadge tone="slate">처리 중...</StatusBadge>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="shrink-0 text-sm font-medium text-slate-600">
          프로젝트명
        </label>

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          placeholder="프로젝트명을 입력하세요"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-1">
        <SecondaryButton onClick={createNewProject}>
          신규
        </SecondaryButton>

        <AccentButton
          onClick={openVersionHistory}
          disabled={!projectId}
          tone="violet"
        >
          버전 보기
        </AccentButton>

        <AccentButton
          onClick={handleSaveProject}
          disabled={!dbReady || isBusy}
          tone="blue"
        >
          저장
        </AccentButton>

        <SecondaryButton onClick={downloadExcel}>
          Excel 다운로드
        </SecondaryButton>

        <SecondaryButton onClick={resetAll}>
          초기화
        </SecondaryButton>

        <SecondaryButton onClick={showPrint}>
          인쇄
        </SecondaryButton>
      </div>
    </div>
  );
}