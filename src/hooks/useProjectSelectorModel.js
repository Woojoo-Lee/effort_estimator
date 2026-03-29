import { useProjectStore } from "../store/useProjectStore";

export function useProjectSelectorModel() {
  const projects = useProjectStore((s) => s.projects);
  const projectId = useProjectStore((s) => s.projectId);
  const loadProject = useProjectStore((s) => s.loadProject);
  const refreshProjects = useProjectStore((s) => s.refreshProjects);
  const dbReady = useProjectStore((s) => s.dbReady);
  const isBusy = useProjectStore((s) => s.isBusy);

  return {
    projects,
    projectId,
    loadProject,
    refreshProjects,
    dbReady,
    isBusy,
  };
}