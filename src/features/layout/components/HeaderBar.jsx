import React from "react";

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
    importJson,
    downloadJson,
    downloadExcel,
    resetAll,
    showPrint,
    openVersionHistory,
  } = actions;

  function handleImportChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      importJson(file);
    }

    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            컨택센터 공수 산정
          </h1>

          <div className="mt-1 text-xs text-slate-400">
            {projectId ? `ID: ${projectId}` : "신규 프로젝트"}
            {savedAt && ` · 저장일: ${savedAt}`}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {!dbReady && (
            <span className="rounded-full bg-red-100 px-2 py-1 text-red-600">
              DB 미연결
            </span>
          )}

          {saveStatus === "dirty" && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
              수정됨
            </span>
          )}

          {saveStatus === "saving" && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
              저장 중...
            </span>
          )}

          {saveStatus === "saved" && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
              저장됨
            </span>
          )}

          {saveStatus === "error" && (
            <span className="rounded-full bg-red-100 px-2 py-1 text-red-600">
              저장 실패
            </span>
          )}

          {isBusy && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
              처리 중...
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600">
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={createNewProject}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
        >
          신규
        </button>

        <button
          onClick={handleSaveProject}
          disabled={!dbReady || isBusy}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          저장
        </button>

        <button
          onClick={openVersionHistory}
          disabled={!projectId}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
        >
          버전 보기
        </button>

        <button
          onClick={downloadJson}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
        >
          JSON 다운로드
        </button>

        <button
          onClick={downloadExcel}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
        >
          Excel 다운로드
        </button>

        <label className="cursor-pointer rounded-lg bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300">
          JSON 불러오기
          <input
            type="file"
            accept=".json"
            onChange={handleImportChange}
            className="hidden"
          />
        </label>

        <button
          onClick={resetAll}
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600"
        >
          초기화
        </button>

        <button
          onClick={showPrint}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          인쇄
        </button>
      </div>
    </div>
  );
}