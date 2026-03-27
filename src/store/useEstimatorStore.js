import { create } from "zustand";

import {
  fetchProjects,
  fetchProjectById,
  saveProject,
} from "../services/projectService";
import { isSupabaseReady } from "../services/supabaseClient";

import {
  deepCloneItems,
  calcSolutionTotals,
  calcGrandBaseTotal,
  calcScaledTotal,
  calcRiskAppliedTotal,
  calcMgmtMd,
  calcFinalTotal,
  emptyProjectState,
} from "../utils/estimatorMath";

export const useEstimatorStore = create((set, get) => {
  const initial = emptyProjectState();

  return {
    projectId: initial.id,
    activeTab: initial.activeTab,
    projectName: initial.projectName,
    itemsBySolution: initial.itemsBySolution,
    scaleFactor: initial.scaleFactor,
    riskFactor: initial.riskFactor,
    mgmtRate: initial.mgmtRate,
    savedAt: initial.savedAt,

    projects: [],
    isBusy: false,
    dbReady: isSupabaseReady,
    isDirty: false,

    toast: {
      message: "",
      tone: "blue",
    },
    _toastTimer: null,

    showToast: (message, tone = "blue", duration = 3000) => {
      const timer = get()._toastTimer;

      if (timer) {
        clearTimeout(timer);
      }

      set({
        toast: { message, tone },
      });

      const newTimer = setTimeout(() => {
        set({
          toast: { message: "", tone: "blue" },
          _toastTimer: null,
        });
      }, duration);

      set({ _toastTimer: newTimer });
    },

    clearToast: () => {
      const timer = get()._toastTimer;

      if (timer) {
        clearTimeout(timer);
      }

      set({
        toast: { message: "", tone: "blue" },
        _toastTimer: null,
      });
    },

    markDirty: () => set({ isDirty: true }),

    setProjectId: (projectId) => set({ projectId }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setProjectName: (projectName) => set({ projectName }),
    setItemsBySolution: (itemsBySolution) => set({ itemsBySolution }),
    setScaleFactor: (scaleFactor) => set({ scaleFactor, isDirty: true }),
    setRiskFactor: (riskFactor) => set({ riskFactor, isDirty: true }),
    setMgmtRate: (mgmtRate) => set({ mgmtRate, isDirty: true }),
    setSavedAt: (savedAt) => set({ savedAt }),
    setIsDirty: (isDirty) => set({ isDirty }),

    setProjectNameWithDirty: (projectName) =>
      set({ projectName, isDirty: true }),

    updateItem: (solutionKey, index, field, value) =>
      set((state) => {
        const next = { ...state.itemsBySolution };
        next[solutionKey] = [...next[solutionKey]];
        next[solutionKey][index] = {
          ...next[solutionKey][index],
          [field]: value,
        };

        return {
          itemsBySolution: next,
          isDirty: true,
        };
      }),

    addItem: (solutionKey) =>
      set((state) => ({
        itemsBySolution: {
          ...state.itemsBySolution,
          [solutionKey]: [
            ...state.itemsBySolution[solutionKey],
            {
              name: "새 업무",
              baseMd: 1,
              difficulty: 1,
              complexity: 1,
              note: "",
            },
          ],
        },
        isDirty: true,
      })),

    removeItem: (solutionKey, index) =>
      set((state) => ({
        itemsBySolution: {
          ...state.itemsBySolution,
          [solutionKey]: state.itemsBySolution[solutionKey].filter(
            (_, i) => i !== index
          ),
        },
        isDirty: true,
      })),

    createNewProject: () => {
      const next = emptyProjectState();

      set({
        projectId: next.id,
        activeTab: next.activeTab,
        projectName: next.projectName,
        itemsBySolution: next.itemsBySolution,
        scaleFactor: next.scaleFactor,
        riskFactor: next.riskFactor,
        mgmtRate: next.mgmtRate,
        savedAt: "",
        isDirty: false,
      });
    },

    refreshProjects: async () => {
      const { dbReady, showToast } = get();

      if (!dbReady) {
        set({ dbReady: false });
        showToast("Supabase 환경변수가 설정되지 않았습니다.", "red");
        return;
      }

      set({ isBusy: true });

      const { data, error } = await fetchProjects();

      if (error) {
        console.error(error);
        showToast("프로젝트 목록 조회 실패", "red");
      } else {
        set({
          projects: data || [],
          dbReady: true,
        });
      }

      set({ isBusy: false });
    },

    handleSaveProject: async () => {
      const state = get();

      if (!state.dbReady) {
        state.showToast("Supabase 환경변수가 설정되지 않았습니다.", "red");
        return;
      }

      set({ isBusy: true });

      const label = new Date().toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const { data, error } = await saveProject({
        projectId: state.projectId,
        activeTab: state.activeTab,
        projectName: state.projectName,
        itemsBySolution: state.itemsBySolution,
        scaleFactor: state.scaleFactor,
        riskFactor: state.riskFactor,
        mgmtRate: state.mgmtRate,
        savedAt: label,
      });

      if (error || !data?.id) {
        console.error(error);
        state.showToast("DB 저장 실패", "red");
      } else {
        set({
          projectId: data.id,
          savedAt: label,
          isDirty: false,
        });

        state.showToast(
          state.projectId ? "DB 업데이트 완료" : "신규 프로젝트 저장 완료",
          "emerald"
        );

        await get().refreshProjects();
      }

      set({ isBusy: false });
    },

    loadProject: async (id) => {
      const { dbReady, showToast } = get();

      if (!dbReady) {
        showToast("Supabase 환경변수가 설정되지 않았습니다.", "red");
        return;
      }

      set({ isBusy: true });

      const { data, error } = await fetchProjectById(id);

      if (error) {
        console.error(error);
        showToast("프로젝트 불러오기 실패", "red");
        set({ isBusy: false });
        return;
      }

      const payload = data?.payload || {};

      set({
        projectId: data.id,
        projectName:
          data.project_name || payload.projectName || "새 컨택센터 프로젝트",
        activeTab: payload.activeTab || "pbx",
        itemsBySolution: payload.itemsBySolution || deepCloneItems(),
        scaleFactor: Number(payload.scaleFactor ?? 1.0),
        riskFactor: Number(payload.riskFactor ?? 1.0),
        mgmtRate: Number(payload.mgmtRate ?? 10),
        savedAt:
          payload.savedAt ||
          (data.updated_at
            ? new Date(data.updated_at).toLocaleString("ko-KR")
            : ""),
        isDirty: false,
      });

      showToast("프로젝트 불러오기 완료", "emerald");
      set({ isBusy: false });
    },

    getSolutionTotals: () => {
      const { itemsBySolution } = get();
      return calcSolutionTotals(itemsBySolution);
    },

    getGrandBaseTotal: () => {
      const solutionTotals = get().getSolutionTotals();
      return calcGrandBaseTotal(solutionTotals);
    },

    getScaledTotal: () => {
      const grandBaseTotal = get().getGrandBaseTotal();
      const { scaleFactor } = get();
      return calcScaledTotal(grandBaseTotal, scaleFactor);
    },

    getRiskAppliedTotal: () => {
      const scaledTotal = get().getScaledTotal();
      const { riskFactor } = get();
      return calcRiskAppliedTotal(scaledTotal, riskFactor);
    },

    getMgmtMd: () => {
      const riskAppliedTotal = get().getRiskAppliedTotal();
      const { mgmtRate } = get();
      return calcMgmtMd(riskAppliedTotal, mgmtRate);
    },

    getFinalTotal: () => {
      const riskAppliedTotal = get().getRiskAppliedTotal();
      const mgmtMd = get().getMgmtMd();
      return calcFinalTotal(riskAppliedTotal, mgmtMd);
    },

    getCurrentItems: () => {
      const { itemsBySolution, activeTab } = get();
      return itemsBySolution[activeTab] || [];
    },
  };
});