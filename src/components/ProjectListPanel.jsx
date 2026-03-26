import React from "react";
import ActionButton from "./ui/ActionButton";

function Panel({ title, children, right, subtle = false }) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border ${
        subtle
          ? "border-blue-100 bg-gradient-to-br from-white to-blue-50/40"
          : "border-slate-200 bg-white"
      } shadow-[0_12px_32px_rgba(15,23,42,0.05)]`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusPill({ children }) {
  return (
    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      {children}
    </span>
  );
}

export default function ProjectListPanel({
  projects,
  projectId,
  loadProject,
  refreshProjects,
  dbReady,
  isBusy,
}) {
  return (
    <Panel
      title="DB 프로젝트 목록"
      subtle
      right={
        <ActionButton onClick={refreshProjects} disabled={!dbReady || isBusy}>
          새로고침
        </ActionButton>
      }
    >
      <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        저장된 프로젝트를 선택하면 즉시 현재 화면으로 불러옵니다. 현재 선택된 프로젝트는 파란색으로 강조됩니다.
      </div>

      <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            저장된 프로젝트가 없습니다.
          </div>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => loadProject(project.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                projectId === project.id
                  ? "border-blue-200 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{project.project_name}</div>
                  <div className="mt-1 text-xs text-slate-500">ID: {project.id}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    업데이트:{" "}
                    {project.updated_at
                      ? new Date(project.updated_at).toLocaleString("ko-KR")
                      : "-"}
                  </div>
                </div>
                {projectId === project.id ? <StatusPill>현재 선택</StatusPill> : null}
              </div>
            </button>
          ))
        )}
      </div>
    </Panel>
  );
}