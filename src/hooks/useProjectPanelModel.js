import { useMemo } from "react";
import { useEstimatorStore } from "../store/useEstimatorStore";

export function useProjectPanelModel() {
  const projects = useEstimatorStore((s) => s.projects);
  const projectId = useEstimatorStore((s) => s.projectId);
  const dbReady = useEstimatorStore((s) => s.dbReady);
  const isBusy = useEstimatorStore((s) => s.isBusy);

  const loadProject = useEstimatorStore((s) => s.loadProject);
  const refreshProjects = useEstimatorStore((s) => s.refreshProjects);

  return useMemo(
    () => ({
      projects,
      projectId,
      dbReady,
      isBusy,
      loadProject,
      refreshProjects,
    }),
    [projects, projectId, dbReady, isBusy, loadProject, refreshProjects]
  );
}