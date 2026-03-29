import React, { useMemo, useState } from "react";
import ActionButton from "./ui/ActionButton";

export default function ProjectListPanel({
  projects,
  projectId,
  loadProject,
  refreshProjects,
  dbReady,
  isBusy,
}) {
  const [selectedId, setSelectedId] = useState(
    projectId ? String(projectId) : ""
  );

  const selectedProject = useMemo(() => {
    const currentId = Number(selectedId || projectId);
    return projects.find((p) => p.id === currentId) || null;
  }, [projects, selectedId, projectId]);

  function handleChange(e) {
    setSelectedId(e.target.value);
  }

  function handleLoad() {
    if (!selectedId) return;
    loadProject(Number(selectedId));
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

      {/* 좌측 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-700 shrink-0">
          DB 프로젝트
        </div>

        <select
          value={selectedId}
          onChange={handleChange}
          disabled={!dbReady || isBusy || projects.length === 0}
          className="h-10 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
        >
          <option value="">프로젝트 선택</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name} (ID: {p.id})
            </option>
          ))}
        </select>

        <button
          onClick={handleLoad}
          disabled={!selectedId || !dbReady || isBusy}
          className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          불러오기
        </button>
      </div>

      {/* 우측 */}
      <div className="flex items-center gap-2 shrink-0">
        <ActionButton
          onClick={refreshProjects}
          disabled={!dbReady || isBusy}
        >
          새로고침
        </ActionButton>

        {selectedProject && (
          <div className="hidden md:block text-xs text-slate-400">
            ID: {selectedProject.id}
          </div>
        )}
      </div>
    </div>
  );
}