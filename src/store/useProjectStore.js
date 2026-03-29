import { create } from "zustand";
import { projectService } from "../services/projectService";

export const useProjectStore = create((set, get) => ({
  projects: [],
  projectId: null,
  isBusy: false,
  dbReady: true,

  async refreshProjects() {
    set({ isBusy: true });
    try {
      const projects = await projectService.getProjects();
      set({ projects });
    } finally {
      set({ isBusy: false });
    }
  },

  async loadProject(id) {
    set({ isBusy: true });
    try {
      const data = await projectService.loadProject(id);

      // 🔥 estimator store에 주입
      const estimator = require("./useEstimatorStore").useEstimatorStore.getState();

      estimator.setProjectId(id);
      estimator.setProjectNameWithDirty(data.project_name);
      estimator.setItemsBySolution(data.items_by_solution || {});
      estimator.setScaleFactor(data.scale_factor || 1);
      estimator.setRiskFactor(data.risk_factor || 1);
      estimator.setMgmtRate(data.mgmt_rate || 10);
      estimator.setSavedAt(new Date());
      estimator.setIsDirty(false);

      set({ projectId: id });
    } finally {
      set({ isBusy: false });
    }
  },
}));