import { useEstimatorStore } from "../store/useEstimatorStore";

export function useProjectSelectorModel() {
  const projects = useEstimatorStore((s) => s.projects);
  const projectId = useEstimatorStore((s) => s.projectId);
  const loadProject = useEstimatorStore((s) => s.loadProject);
  const refreshProjects = useEstimatorStore((s) => s.refreshProjects);
  const dbReady = useEstimatorStore((s) => s.dbReady);
  const isBusy = useEstimatorStore((s) => s.isBusy);

  return {
    projects,
    projectId,
    loadProject,
    refreshProjects,
    dbReady,
    isBusy,
  };
}