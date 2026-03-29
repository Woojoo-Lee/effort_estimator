import React, { useEffect, useMemo, useRef, useState } from "react";
import ActionButton from "../../../shared/ui/ActionButton";

const RECENT_KEY = "cc_recent_project_ids";
const MAX_RECENT = 5;

function readRecentIds() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecentIds(ids) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export default function ProjectSelectorBar({
  projects,
  projectId,
  loadProject,
  refreshProjects,
  dbReady,
  isBusy,
}) {
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(projectId ? String(projectId) : "");
  const [recentIds, setRecentIds] = useState(() => readRecentIds());

  const selectRef = useRef(null);

  useEffect(() => {
    setSelectedId(projectId ? String(projectId) : "");
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    setRecentIds((prev) => {
      const next = [
        String(projectId),
        ...prev.filter((id) => id !== String(projectId)),
      ].slice(0, MAX_RECENT);

      writeRecentIds(next);
      return next;
    });
  }, [projectId]);

  const filteredProjects = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return projects;

    return projects.filter((project) => {
      const name = String(project.project_name || "").toLowerCase();
      const id = String(project.id || "");
      return name.includes(q) || id.includes(q);
    });
  }, [projects, keyword]);

  const selectedProject = useMemo(() => {
    const currentId = Number(selectedId || projectId);
    return projects.find((p) => p.id === currentId) || null;
  }, [projects, selectedId, projectId]);

  const recentProjects = useMemo(() => {
    return recentIds
      .map((id) => projects.find((p) => String(p.id) === String(id)))
      .filter(Boolean);
  }, [recentIds, projects]);

  async function handleLoad(idOverride) {
    const targetId = idOverride ?? selectedId;
    if (!targetId) return;
    await loadProject(Number(targetId));
  }

  async function handleLoadRecent(id) {
    setSelectedId(String(id));
    await handleLoad(String(id));
  }

  function handleClearRecent() {
    setRecentIds([]);
    writeRecentIds([]);
  }

  async function handleKeywordEnter() {
    if (!dbReady || isBusy) return;

    if (selectedId) {
      await handleLoad(selectedId);
      return;
    }

    if (filteredProjects.length > 0) {
      const firstId = String(filteredProjects[0].id);
      setSelectedId(firstId);
      await handleLoad(firstId);
    }
  }

  return (
    <div className="rounded-b-2xl border border-slate-200 border-t-0 bg-white px-4 py-3 shadow-sm">
      {recentProjects.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            최근 프로젝트
          </span>

          {recentProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleLoadRecent(project.id)}
              disabled={isBusy || !dbReady}
              className={`max-w-[220px] rounded-full px-3 py-1 text-xs font-medium transition ${
                String(project.id) === String(projectId)
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              title={`${project.project_name} (ID: ${project.id})`}
            >
              <span className="truncate">
                {project.project_name} (ID: {project.id})
              </span>
            </button>
          ))}

          <button
            onClick={handleClearRecent}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            비우기
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
          <div className="shrink-0 text-sm font-semibold text-slate-700">
            DB 프로젝트
          </div>

          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              if (selectedId) setSelectedId("");
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleKeywordEnter();
              }

              if (e.key === "ArrowDown") {
                e.preventDefault();
                selectRef.current?.focus();
              }
            }}
            placeholder="프로젝트명 또는 ID 검색"
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-400 lg:w-[240px]"
          />

          <select
            ref={selectRef}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={!dbReady || isBusy || filteredProjects.length === 0}
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-400"
          >
            <option value="">
              {filteredProjects.length > 0
                ? "프로젝트 선택"
                : keyword
                ? "검색 결과 없음"
                : "프로젝트 없음"}
            </option>

            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} (ID: {p.id})
              </option>
            ))}
          </select>

          <button
            onClick={() => handleLoad()}
            disabled={!selectedId || !dbReady || isBusy}
            className="h-10 shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            불러오기
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ActionButton onClick={refreshProjects} disabled={!dbReady || isBusy}>
            새로고침
          </ActionButton>

          {selectedProject && (
            <div className="hidden text-xs text-slate-400 md:block">
              현재 선택 ID: {selectedProject.id}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          전체 {projects.length}건 / 검색 결과 {filteredProjects.length}건
        </span>
        {keyword && (
          <button
            onClick={() => {
              setKeyword("");
              setSelectedId(projectId ? String(projectId) : "");
            }}
            className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100"
          >
            검색 초기화
          </button>
        )}
      </div>
    </div>
  );
}