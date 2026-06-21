import React, { useEffect, useMemo, useState } from "react";
import ActionButton from "../../../shared/ui/ActionButton";

const TEXT = {
  title: "프로젝트 선택",
  selectPlaceholder: "프로젝트를 선택해 주세요",
  emptyProjects: "불러올 프로젝트가 없습니다",
  refresh: "새로고침",
  excel: "Excel 다운로드",
  totalCount: "전체",
  countUnit: "건",
  selectedArchived: "현재 선택된 보관 프로젝트",
  noProject: "프로젝트를 선택해 주세요.",
  effortLastChange: "공수 산정 수정",
  effortUpdater: "수정자",
  loading: "불러오는 중...",
  none: "-",
};

function formatDateTime(value) {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getProjectLabel(project) {
  return project?.project_name || `Project ${project?.id ?? ""}`;
}

function getLastChangeUpdater(lastChange = {}) {
  return (
    lastChange.updated_by_display_name ||
    lastChange.updated_by_login_id ||
    TEXT.none
  );
}

function isArchivedProject(project) {
  return project?.status === "archived" || Boolean(project?.archived_at);
}

export default function ProjectSelectorBar({
  projects,
  projectId,
  loadProject,
  refreshProjects,
  dbReady,
  isBusy,
  downloadExcel,
  canDownloadExcel = true,
  excelDisabledReason = "",
  showExcelButton = Boolean(downloadExcel),
  standardEffortLastChange = null,
  standardEffortLastChangeLoading = false,
}) {
  const [selectedId, setSelectedId] = useState(projectId ? String(projectId) : "");
  const selectableProjects = useMemo(
    () => projects.filter((project) => !isArchivedProject(project)),
    [projects]
  );

  useEffect(() => {
    setSelectedId(projectId ? String(projectId) : "");
  }, [projectId]);

  const selectedProject = useMemo(() => {
    const currentId = String(projectId || selectedId || "");
    return (
      projects.find((project) => String(project.id) === currentId) || null
    );
  }, [projects, projectId, selectedId]);
  const isSelectedArchived = isArchivedProject(selectedProject);
  const hasSelectedProject = Boolean(projectId || selectedId);
  const lastChangeDate = formatDateTime(standardEffortLastChange?.updated_at);
  const lastChangeText = standardEffortLastChangeLoading
    ? TEXT.loading
    : lastChangeDate || TEXT.none;
  const updaterText = standardEffortLastChangeLoading
    ? TEXT.loading
    : getLastChangeUpdater(standardEffortLastChange || {});

  async function handleSelectProject(event) {
    const nextId = event.target.value;
    setSelectedId(nextId);

    if (!nextId) {
      return;
    }

    await loadProject(Number(nextId));
  }

  function handleRefresh() {
    refreshProjects?.();
  }

  function handleDownloadExcel() {
    if (!downloadExcel || !canDownloadExcel || !projectId) {
      return;
    }

    downloadExcel();
  }

  const excelDisabled =
    !downloadExcel || !canDownloadExcel || !projectId || isBusy;

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            {TEXT.title}
          </span>
          <select
            value={selectedId}
            onChange={handleSelectProject}
            disabled={!dbReady || isBusy || selectableProjects.length === 0}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {selectableProjects.length > 0
                ? TEXT.selectPlaceholder
                : TEXT.emptyProjects}
            </option>

            {selectableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {getProjectLabel(project)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <ActionButton
            type="button"
            onClick={handleRefresh}
            disabled={!dbReady || isBusy}
            aria-label={TEXT.refresh}
            title={TEXT.refresh}
            className="h-10 min-w-10 px-3"
          >
            ↻
          </ActionButton>

          {showExcelButton ? (
            <ActionButton
              type="button"
              onClick={handleDownloadExcel}
              disabled={excelDisabled}
              aria-label={TEXT.excel}
              title={excelDisabledReason || TEXT.excel}
              className="h-10 min-w-10 px-3"
            >
              XLS
            </ActionButton>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          {hasSelectedProject ? (
            <>
              <span>
                {TEXT.effortLastChange}: {lastChangeText}
              </span>
              <span className="mx-2 text-slate-300">/</span>
              <span>
                {TEXT.effortUpdater}: {updaterText}
              </span>
            </>
          ) : (
            <span>{TEXT.noProject}</span>
          )}
        </div>

        <div className="text-slate-400">
          {TEXT.totalCount} {selectableProjects.length}
          {TEXT.countUnit}
        </div>
      </div>

      {isSelectedArchived ? (
        <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          {TEXT.selectedArchived}: {getProjectLabel(selectedProject)}
        </div>
      ) : null}
    </section>
  );
}
