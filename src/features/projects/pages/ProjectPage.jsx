import React, { useEffect } from "react";

import { useEstimatorStore } from "../../../store/useEstimatorStore";
import ProjectForm from "../components/ProjectForm";
import ProjectList from "../components/ProjectList";

export default function ProjectPage() {
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

  const isBusy = isProjectsBusy || isProjectActionBusy;
  const currentProject = projects.find(
    (project) => String(project.id) === String(projectId || "")
  );
  const currentUpdatedAt = savedAt || currentProject?.updated_at || "";

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return (
    <div className="mx-auto w-full max-w-[1360px] p-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h1 className="text-xl font-extrabold text-slate-900">
            프로젝트 관리
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            생성, 선택, 삭제 후 공수 산정 화면으로 이어집니다.
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
          createProjectFromDraft={createProjectFromDraft}
          disabled={isBusy}
        />

        {lastProjectsError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {lastProjectsError}
          </div>
        )}

        <ProjectList
          projects={projects}
          currentProjectId={projectId}
          selectProject={selectProject}
          deleteProject={deleteProject}
          refreshProjects={refreshProjects}
          disabled={isBusy}
        />
      </div>
    </div>
  );
}
