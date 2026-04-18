import React, { useEffect, useMemo, useState } from "react";
import ActionButton from "../../../shared/ui/ActionButton";

const TEXT = {
  title: "DB \uD504\uB85C\uC81D\uD2B8",
  currentProject: "\uD604\uC7AC \uC120\uD0DD \uD504\uB85C\uC81D\uD2B8",
  noProject: "\uC120\uD0DD\uB41C \uD504\uB85C\uC81D\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  selectLabel: "\uD504\uB85C\uC81D\uD2B8 \uC120\uD0DD",
  selectPlaceholder: "\uBD88\uB7EC\uC62C \uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD558\uC138\uC694",
  emptyProjects: "\uBD88\uB7EC\uC62C \uD504\uB85C\uC81D\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
  refresh: "\uC0C8\uB85C\uACE0\uCE68",
  updatedAt: "\uC218\uC815\uC77C",
  projectId: "ID",
  totalCount: "\uC804\uCCB4",
  countUnit: "\uAC74",
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getProjectLabel(project) {
  const name = project.project_name || `Project ${project.id}`;
  const updatedAt = formatDate(project.updated_at);

  if (!updatedAt) {
    return `${name} (${TEXT.projectId}: ${project.id})`;
  }

  return `${name} (${TEXT.projectId}: ${project.id}, ${TEXT.updatedAt}: ${updatedAt})`;
}

export default function ProjectSelectorBar({
  projects,
  projectId,
  loadProject,
  refreshProjects,
  dbReady,
  isBusy,
}) {
  const [selectedId, setSelectedId] = useState(projectId ? String(projectId) : "");

  useEffect(() => {
    setSelectedId(projectId ? String(projectId) : "");
  }, [projectId]);

  const selectedProject = useMemo(() => {
    const currentId = Number(projectId || selectedId);
    return projects.find((project) => project.id === currentId) || null;
  }, [projects, projectId, selectedId]);

  async function handleSelectProject(event) {
    const nextId = event.target.value;
    setSelectedId(nextId);

    if (!nextId) {
      return;
    }

    await loadProject(Number(nextId));
  }

  return (
    <div className="rounded-b-2xl border border-slate-200 border-t-0 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-500">{TEXT.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">
              {TEXT.currentProject}
            </span>
            <span className="min-w-0 truncate text-sm font-extrabold text-slate-900">
              {selectedProject
                ? getProjectLabel(selectedProject)
                : TEXT.noProject}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-end">
          <label className="block min-w-0 md:w-[420px]">
            <span className="mb-1 block text-xs font-bold text-slate-600">
              {TEXT.selectLabel}
            </span>
            <select
              value={selectedId}
              onChange={handleSelectProject}
              disabled={!dbReady || isBusy || projects.length === 0}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {projects.length > 0 ? TEXT.selectPlaceholder : TEXT.emptyProjects}
              </option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {getProjectLabel(project)}
                </option>
              ))}
            </select>
          </label>

          <ActionButton
            onClick={refreshProjects}
            disabled={!dbReady || isBusy}
            className="h-10 shrink-0"
          >
            {TEXT.refresh}
          </ActionButton>
        </div>
      </div>

      <div className="mt-2 text-xs font-semibold text-slate-400">
        {TEXT.totalCount} {projects.length}
        {TEXT.countUnit}
      </div>
    </div>
  );
}
