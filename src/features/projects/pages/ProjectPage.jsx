import React, { useEffect, useState } from "react";

import { useEstimatorStore } from "../../../store/useEstimatorStore";
import {
  PERMISSIONS,
  isAuthPermissionEnabled,
  useAuthPermission,
} from "../../auth";
import {
  fetchProjects,
  restoreProjectById,
} from "../../../services/projectService";
import ProjectForm from "../components/ProjectForm";
import ProjectList from "../components/ProjectList";
import {
  canManageProject,
  getAuthUserId,
  getProjectManageDisabledReason,
  getProjectOwnerUserId,
  isOwnedByUser,
} from "../lib/projectAccessPolicy";

export { getProjectOwnerUserId, isOwnedByUser };

export default function ProjectPage() {
  const { authz, user } = useAuthPermission();
  const projects = useEstimatorStore((state) => state.projects);
  const projectId = useEstimatorStore((state) => state.projectId);
  const projectName = useEstimatorStore((state) => state.projectName);
  const savedAt = useEstimatorStore((state) => state.savedAt);
  const draftProjectName = useEstimatorStore((state) => state.draftProjectName);
  const isProjectsBusy = useEstimatorStore((state) => state.isProjectsBusy);
  const isProjectActionBusy = useEstimatorStore(
    (state) => state.isProjectActionBusy
  );
  const lastProjectsError = useEstimatorStore(
    (state) => state.lastProjectsError
  );

  const refreshProjects = useEstimatorStore((state) => state.refreshProjects);
  const createProjectFromDraft = useEstimatorStore(
    (state) => state.createProjectFromDraft
  );
  const selectProject = useEstimatorStore((state) => state.selectProject);
  const deleteProject = useEstimatorStore((state) => state.deleteProject);
  const setDraftProjectName = useEstimatorStore(
    (state) => state.setDraftProjectName
  );
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [archivedSuccessMessage, setArchivedSuccessMessage] = useState("");
  const [restoringProjectId, setRestoringProjectId] = useState(null);

  const authPermissionEnabled = isAuthPermissionEnabled(import.meta.env);
  const canCreateProject =
    !authPermissionEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.PROJECT_CREATE,
      PERMISSIONS.PROJECT_WRITE_OWN,
      PERMISSIONS.PROJECT_WRITE_ASSIGNED,
      PERMISSIONS.PROJECT_WRITE_ALL,
    ]);
  const canArchiveProject =
    !authPermissionEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.PROJECT_ARCHIVE,
      PERMISSIONS.PROJECT_WRITE_OWN,
      PERMISSIONS.PROJECT_WRITE_ASSIGNED,
      PERMISSIONS.PROJECT_WRITE_ALL,
    ]);
  const archiveDisabledReason = "프로젝트 보관 권한이 없습니다.";
  const canRestoreArchivedProject =
    !authPermissionEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.PROJECT_RESTORE,
      PERMISSIONS.PROJECT_WRITE_OWN,
      PERMISSIONS.PROJECT_WRITE_ASSIGNED,
      PERMISSIONS.PROJECT_WRITE_ALL,
    ]);
  const currentUser = user || authz.user || null;
  const currentUserId = getAuthUserId(currentUser);
  const restoreDisabledReasonBase = "프로젝트 복원 권한이 없습니다.";
  const archiveOwnerDisabledReason = "등록자 본인만 보관할 수 있습니다.";
  const restoreOwnerDisabledReason = "등록자 본인만 복원할 수 있습니다.";
  const missingArchiveOwnerDisabledReason =
    "등록자 정보를 확인할 수 없어 보관할 수 없습니다.";
  const missingRestoreOwnerDisabledReason =
    "등록자 정보를 확인할 수 없어 복원할 수 없습니다.";
  const getArchiveActionDisabledReason = (project) => {
    if (!canArchiveProject) {
      return archiveDisabledReason;
    }

    if (!authPermissionEnabled) {
      if (!getProjectOwnerUserId(project)) {
        return missingArchiveOwnerDisabledReason;
      }

      if (!isOwnedByUser(project, currentUserId)) {
        return archiveOwnerDisabledReason;
      }

      return "";
    }

    return (
      getProjectManageDisabledReason(project, {
        authz,
        user: currentUser,
        missingOwnerReason: missingArchiveOwnerDisabledReason,
        otherOwnerReason: archiveOwnerDisabledReason,
        noPermissionReason: archiveDisabledReason,
      }) || archiveDisabledReason
    );
  };
  const getRestoreActionDisabledReason = (project) => {
    if (!canRestoreArchivedProject) {
      return restoreDisabledReasonBase;
    }

    if (!authPermissionEnabled) {
      if (!getProjectOwnerUserId(project)) {
        return missingRestoreOwnerDisabledReason;
      }

      if (!isOwnedByUser(project, currentUserId)) {
        return restoreOwnerDisabledReason;
      }

      return "";
    }

    return (
      getProjectManageDisabledReason(project, {
        authz,
        user: currentUser,
        missingOwnerReason: missingRestoreOwnerDisabledReason,
        otherOwnerReason: restoreOwnerDisabledReason,
        noPermissionReason: restoreDisabledReasonBase,
      }) || restoreDisabledReasonBase
    );
  };
  const canArchiveProjectRow = (project) =>
    canArchiveProject &&
    (authPermissionEnabled
      ? canManageProject(project, { authz, user: currentUser })
      : isOwnedByUser(project, currentUserId));
  const canRestoreArchivedProjectRow = (project) =>
    canRestoreArchivedProject &&
    (authPermissionEnabled
      ? canManageProject(project, { authz, user: currentUser })
      : isOwnedByUser(project, currentUserId));
  const isBusy = isProjectsBusy || isProjectActionBusy;
  const isArchiveView = showArchivedProjects;
  const displayedProjects = isArchiveView ? archivedProjects : projects;
  const displayedProjectsBusy = isArchiveView
    ? isBusy || archivedLoading
    : isBusy;
  const currentProject = projects.find(
    (project) => String(project.id) === String(projectId || "")
  );
  const currentUpdatedAt = savedAt || currentProject?.updated_at || "";

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  async function handleCreateProjectFromDraft() {
    return createProjectFromDraft({ currentUser });
  }

  async function handleArchiveProject(projectId) {
    return deleteProject(projectId, { currentUser });
  }

  async function loadArchivedProjects() {
    setArchivedLoading(true);
    setArchivedError("");
    setArchivedSuccessMessage("");

    const { data, error } = await fetchProjects({ status: "archived" });

    if (error) {
      console.error(error);
      setArchivedError("보관 프로젝트 목록 조회에 실패했습니다.");
      setArchivedProjects([]);
    } else {
      setArchivedProjects(data || []);
    }

    setArchivedLoading(false);
  }

  async function handleArchiveViewToggle() {
    const nextShowArchived = !showArchivedProjects;

    setShowArchivedProjects(nextShowArchived);

    if (nextShowArchived) {
      await loadArchivedProjects();
    } else {
      setArchivedError("");
      setArchivedSuccessMessage("");
    }
  }

  async function handleRestoreProject(project) {
    if (!project?.id) {
      return;
    }

    setRestoringProjectId(project.id);
    setArchivedError("");
    setArchivedSuccessMessage("");

    try {
      const { error } = await restoreProjectById(project.id, { currentUser });

      if (error) {
        throw error;
      }

      await loadArchivedProjects();
      await refreshProjects();
      setArchivedSuccessMessage("프로젝트가 복원되었습니다.");
    } catch (error) {
      console.error(error);
      setArchivedError("프로젝트 복원에 실패했습니다.");
    } finally {
      setRestoringProjectId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1360px] p-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h1 className="text-xl font-extrabold text-slate-900">
            프로젝트 관리
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            프로젝트 생성, 선택, 보관 상태 확인을 위한 관리자용 보조 화면입니다.
          </p>
        </div>

        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          {projectId ? (
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs font-bold text-slate-400">
                  현재 프로젝트명
                </div>
                <div className="mt-1 truncate font-extrabold text-slate-900">
                  {projectName || currentProject?.project_name || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400">
                  projectId
                </div>
                <div className="mt-1 truncate font-mono text-xs font-bold text-slate-600">
                  {projectId}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400">
                  savedAt / updated_at
                </div>
                <div className="mt-1 font-bold text-slate-700">
                  {currentUpdatedAt || "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-500">
              현재 선택된 프로젝트가 없습니다.
            </div>
          )}
        </div>

        <ProjectForm
          draftProjectName={draftProjectName}
          setDraftProjectName={setDraftProjectName}
          createProjectFromDraft={handleCreateProjectFromDraft}
          disabled={isBusy}
          canCreateProject={canCreateProject}
          createDisabledReason="프로젝트 생성 권한이 없습니다."
        />

        {lastProjectsError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {lastProjectsError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">
              {isArchiveView ? "보관 프로젝트" : "활성 프로젝트"}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              {isArchiveView
                ? `보관 ${archivedProjects.length}건`
                : `활성 ${projects.length}건`}
            </div>
          </div>
          <button
            type="button"
            onClick={handleArchiveViewToggle}
            disabled={isBusy || archivedLoading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {isArchiveView ? "활성 프로젝트 보기" : "보관 프로젝트 보기"}
          </button>
        </div>

        {archivedError && isArchiveView && (
          <div className="mx-6 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {archivedError}
          </div>
        )}

        {archivedSuccessMessage && isArchiveView && (
          <div className="mx-6 mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {archivedSuccessMessage}
          </div>
        )}

        <ProjectList
          projects={displayedProjects}
          currentProjectId={projectId}
          selectProject={selectProject}
          deleteProject={handleArchiveProject}
          refreshProjects={isArchiveView ? loadArchivedProjects : refreshProjects}
          disabled={displayedProjectsBusy}
          listTitle={isArchiveView ? "보관 프로젝트 목록" : "프로젝트 목록"}
          countLabel={isArchiveView ? "보관" : "전체"}
          emptyTitle={
            isArchiveView ? "보관 프로젝트가 없습니다" : "프로젝트가 없습니다"
          }
          emptyDescription={
            isArchiveView
              ? "표시할 보관 프로젝트가 없습니다."
              : "프로젝트명을 입력하고 산정 프로젝트를 시작하세요."
          }
          deleteActionLabel="보관"
          deleteConfirmActionLabel="보관 처리"
          disableSelectArchived={isArchiveView}
          hideDeleteForArchived={isArchiveView}
          restoreProject={isArchiveView ? handleRestoreProject : undefined}
          restoringProjectId={restoringProjectId}
          canDeleteProject={canArchiveProjectRow}
          deleteDisabledReason={getArchiveActionDisabledReason}
          canRestoreArchivedProject={canRestoreArchivedProjectRow}
          restoreDisabledReason={getRestoreActionDisabledReason}
        />
      </div>
    </div>
  );
}
