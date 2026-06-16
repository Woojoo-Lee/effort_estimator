import React, { useState } from "react";

import ActionButton from "../../../shared/ui/ActionButton";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isArchivedProject(project) {
  return project?.status === "archived" || Boolean(project?.archived_at);
}

export default function ProjectList({
  projects = [],
  currentProjectId,
  selectProject,
  deleteProject,
  refreshProjects,
  disabled = false,
  listTitle = "프로젝트 목록",
  countLabel = "전체",
  emptyTitle = "프로젝트가 없습니다",
  emptyDescription = "프로젝트명을 입력하고 산정 프로젝트를 시작하세요.",
  deleteActionLabel = "보관",
  deleteConfirmActionLabel = "보관 처리",
  disableSelectArchived = false,
  hideDeleteForArchived = false,
  restoreProject,
  restoringProjectId = null,
  restoreActionLabel = "복원",
  restoreConfirmActionLabel = "복원",
  canDeleteProject = true,
  deleteDisabledReason = "프로젝트 보관 권한이 없습니다.",
  canRestoreArchivedProject = true,
  restoreDisabledReason = "프로젝트 복원 권한이 없습니다.",
}) {
  const [confirmingProjectId, setConfirmingProjectId] = useState(null);
  const [confirmingRestoreProjectId, setConfirmingRestoreProjectId] =
    useState(null);

  function handleDeleteClick(project) {
    if (!canDeleteProject) {
      return;
    }

    setConfirmingProjectId(project.id);
    setConfirmingRestoreProjectId(null);
  }

  async function handleConfirmDelete(project) {
    if (!canDeleteProject) {
      return;
    }

    await deleteProject(project.id);
    setConfirmingProjectId(null);
  }

  function handleCancelDelete() {
    setConfirmingProjectId(null);
  }

  function handleRestoreClick(project) {
    if (!restoreProject || !canRestoreArchivedProject) {
      return;
    }

    setConfirmingRestoreProjectId(project.id);
    setConfirmingProjectId(null);
  }

  async function handleConfirmRestore(project) {
    if (!restoreProject || !canRestoreArchivedProject) {
      return;
    }

    await restoreProject(project);
    setConfirmingRestoreProjectId(null);
  }

  function handleCancelRestore() {
    setConfirmingRestoreProjectId(null);
  }

  if (projects.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="text-base font-extrabold text-slate-800">
          {emptyTitle}
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-500">
          {emptyDescription}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <div className="text-sm font-extrabold text-slate-900">
            {listTitle}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-400">
            {countLabel} {projects.length}건
          </div>
        </div>
        <ActionButton onClick={refreshProjects} disabled={disabled}>
          새로고침
        </ActionButton>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3">프로젝트명</th>
              <th className="px-4 py-3">수정일</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-6 py-3 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const isCurrent =
                String(project.id) === String(currentProjectId || "");
              const isConfirming =
                String(confirmingProjectId || "") === String(project.id);
              const isConfirmingRestore =
                String(confirmingRestoreProjectId || "") ===
                String(project.id);
              const isRestoring =
                String(restoringProjectId || "") === String(project.id);
              const isArchived = isArchivedProject(project);
              const selectDisabled =
                disabled || (disableSelectArchived && isArchived);
              const showDelete = !(hideDeleteForArchived && isArchived);
              const deleteDisabled = disabled || !canDeleteProject;
              const deleteTitle = canDeleteProject
                ? undefined
                : deleteDisabledReason;
              const showRestore = Boolean(restoreProject) && isArchived;
              const restoreDisabled =
                disabled || isRestoring || !canRestoreArchivedProject;
              const restoreTitle = canRestoreArchivedProject
                ? undefined
                : restoreDisabledReason;

              return (
                <tr
                  key={project.id}
                  className={`border-b border-slate-100 last:border-b-0 ${
                    isCurrent ? "bg-blue-50/70" : "bg-white"
                  }`}
                >
                  <td className="max-w-[360px] px-6 py-4">
                    <button
                      type="button"
                      onClick={() => selectProject(project.id)}
                      disabled={selectDisabled}
                      className="block max-w-full truncate text-left font-extrabold text-slate-900 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {project.project_name || `Project ${project.id}`}
                    </button>
                    {isArchived && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-700">
                          보관됨
                        </span>
                        {project.archived_at && (
                          <span className="text-xs font-semibold text-slate-400">
                            보관일 {formatDate(project.archived_at)}
                          </span>
                        )}
                      </div>
                    )}
                    {isCurrent && (
                      <div className="mt-1 text-xs font-bold text-blue-600">
                        현재 선택됨
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">
                    {formatDate(project.updated_at)}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-4 font-mono text-xs text-slate-400">
                    {project.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        onClick={() => selectProject(project.id)}
                        disabled={selectDisabled}
                      >
                        {disabled ? "불러오는 중..." : "선택"}
                      </ActionButton>
                      {showDelete &&
                        (isConfirming ? (
                          <>
                            <ActionButton
                              onClick={() => handleConfirmDelete(project)}
                              disabled={deleteDisabled}
                              title={deleteTitle}
                            >
                              {deleteConfirmActionLabel}
                            </ActionButton>
                            <ActionButton
                              onClick={handleCancelDelete}
                              disabled={disabled}
                            >
                              취소
                            </ActionButton>
                          </>
                        ) : (
                          <ActionButton
                            onClick={() => handleDeleteClick(project)}
                            disabled={deleteDisabled}
                            title={deleteTitle}
                          >
                            {deleteActionLabel}
                          </ActionButton>
                        ))}
                      {showRestore &&
                        (isConfirmingRestore ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs font-bold text-slate-500">
                              이 프로젝트를 복원할까요?
                            </span>
                            <div className="flex justify-end gap-2">
                              <ActionButton
                                onClick={() => handleConfirmRestore(project)}
                                disabled={restoreDisabled}
                                title={restoreTitle}
                              >
                                {isRestoring
                                  ? "복원 중..."
                                  : restoreConfirmActionLabel}
                              </ActionButton>
                              <ActionButton
                                onClick={handleCancelRestore}
                                disabled={disabled || isRestoring}
                              >
                                취소
                              </ActionButton>
                            </div>
                          </div>
                        ) : (
                          <ActionButton
                            onClick={() => handleRestoreClick(project)}
                            disabled={restoreDisabled}
                            title={restoreTitle}
                          >
                            {isRestoring ? "복원 중..." : restoreActionLabel}
                          </ActionButton>
                        ))}
                      {showRestore && !canRestoreArchivedProject ? (
                        <span className="self-center text-xs font-bold text-slate-400">
                          프로젝트 복원 권한이 없습니다.
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
