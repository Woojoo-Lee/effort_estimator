import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  fetchProjects,
  fetchProjectById,
  saveProject,
  fetchProjectVersions,
  fetchLatestProjectVersionNo,
  saveProjectVersion,
} from "../services/projectService";
import { isSupabaseReady } from "../services/supabaseClient";

import {
  deepCloneItems,
  emptyProjectState,
} from "../shared/lib/estimatorMath";

const STORE_VERSION = 1;

// =========================================
// Helpers
// =========================================
const createFreshProjectState = () => {
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
    isDirty: false,
  };
};

const getDefaultToast = () => ({
  message: "",
  tone: "blue",
});

const buildProjectPayload = (state, savedAt = "") => ({
  activeTab: state.activeTab,
  projectName: state.projectName,
  itemsBySolution: state.itemsBySolution,
  scaleFactor: state.scaleFactor,
  riskFactor: state.riskFactor,
  mgmtRate: state.mgmtRate,
  savedAt,
});

export const useEstimatorStore = create(
  persist(
    (set, get) => {
      const fresh = createFreshProjectState();

      return {
        // =========================================
        // 1) Base project / estimator state
        // =========================================
        ...fresh,

        // =========================================
        // 2) Project list / version state
        // =========================================
        projects: [],
        versions: [],

        // =========================================
        // 3) UI / runtime state
        // =========================================
        isBusy: false,
        isVersionsBusy: false,
        dbReady: isSupabaseReady,

        saveStatus: "idle",
        lastSaveError: "",

        // =========================================
        // 4) Toast state
        // =========================================
        toast: getDefaultToast(),
        _toastTimer: null,

        // =========================================
        // 5) Toast actions
        // =========================================
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
              toast: getDefaultToast(),
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
            toast: getDefaultToast(),
            _toastTimer: null,
          });
        },

        // =========================================
        // 6) Basic setters
        // =========================================
        markDirty: () => set({ isDirty: true, saveStatus: "dirty" }),

        setProjectId: (projectId) => set({ projectId }),
        setActiveTab: (activeTab) => set({ activeTab }),
        setProjectName: (projectName) => set({ projectName }),

        setItemsBySolution: (itemsBySolution) =>
          set({
            itemsBySolution,
            isDirty: true,
            saveStatus: "dirty",
          }),

        setScaleFactor: (scaleFactor) =>
          set({
            scaleFactor,
            isDirty: true,
            saveStatus: "dirty",
          }),

        setRiskFactor: (riskFactor) =>
          set({
            riskFactor,
            isDirty: true,
            saveStatus: "dirty",
          }),

        setMgmtRate: (mgmtRate) =>
          set({
            mgmtRate,
            isDirty: true,
            saveStatus: "dirty",
          }),

        setSavedAt: (savedAt) => set({ savedAt }),
        setIsDirty: (isDirty) => set({ isDirty }),

        setProjectNameWithDirty: (projectName) =>
          set({
            projectName,
            isDirty: true,
            saveStatus: "dirty",
          }),

        // =========================================
        // 7) DetailTable item actions
        // =========================================
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
              saveStatus: "dirty",
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
            saveStatus: "dirty",
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
            saveStatus: "dirty",
          })),

        // =========================================
        // 8) Project lifecycle actions
        // =========================================
        createNewProject: () => {
          const next = createFreshProjectState();

          set({
            ...next,
            versions: [],
            toast: getDefaultToast(),
            saveStatus: "idle",
            lastSaveError: "",
          });
        },

        refreshProjects: async () => {
          const { dbReady, showToast } = get();

          if (!dbReady) {
            set({
              dbReady: false,
              saveStatus: "error",
              lastSaveError: "Supabase 환경변수가 설정되지 않았습니다.",
            });
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

        handleSaveProject: async ({ silent = false } = {}) => {
          const state = get();

          if (!state.dbReady) {
            set({
              saveStatus: "error",
              lastSaveError: "Supabase 환경변수가 설정되지 않았습니다.",
            });

            if (!silent) {
              state.showToast("Supabase 환경변수가 설정되지 않았습니다.", "red");
            }
            return;
          }

          set({
            isBusy: true,
            saveStatus: "saving",
            lastSaveError: "",
          });

          const label = new Date().toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

          const isUpdate = Boolean(state.projectId);
          const payload = buildProjectPayload(state, label);

          const { data, error } = await saveProject({
            projectId: state.projectId,
            projectName: state.projectName,
            payload,
          });

          if (error || !data?.id) {
            console.error(error);

            set({
              isBusy: false,
              saveStatus: "error",
              lastSaveError: "DB 저장 실패",
            });

            if (!silent) {
              state.showToast("DB 저장 실패", "red");
            }
            return;
          }

          if (!silent) {
            try {
              const { data: latestVersionRow, error: latestVersionError } =
                await fetchLatestProjectVersionNo(data.id);

              if (latestVersionError) {
                console.error(latestVersionError);
              } else {
                const nextVersionNo = (latestVersionRow?.version_no || 0) + 1;

                const { error: versionSaveError } = await saveProjectVersion({
                  projectId: data.id,
                  versionNo: nextVersionNo,
                  savedType: "manual",
                  projectName: state.projectName,
                  payload,
                });

                if (versionSaveError) {
                  console.error(versionSaveError);
                }
              }
            } catch (versionError) {
              console.error(versionError);
            }
          }

          set({
            projectId: data.id,
            savedAt: label,
            isDirty: false,
            isBusy: false,
            saveStatus: "saved",
            lastSaveError: "",
          });

          if (!silent) {
            state.showToast(
              isUpdate ? "DB 업데이트 완료" : "신규 프로젝트 저장 완료",
              "emerald"
            );
          }

          await get().refreshProjects();

          if (!silent) {
            await get().refreshVersions();
          }
        },

        loadProject: async (id) => {
          const { dbReady, showToast } = get();

          if (!dbReady) {
            set({
              saveStatus: "error",
              lastSaveError: "Supabase 환경변수가 설정되지 않았습니다.",
            });
            showToast("Supabase 환경변수가 설정되지 않았습니다.", "red");
            return;
          }

          set({ isBusy: true });

          const { data, error } = await fetchProjectById(id);

          if (error) {
            console.error(error);
            showToast("프로젝트 불러오기 실패", "red");
            set({
              isBusy: false,
              saveStatus: "error",
              lastSaveError: "프로젝트 불러오기 실패",
            });
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
            isBusy: false,
            saveStatus: "saved",
            lastSaveError: "",
          });

          showToast("프로젝트 불러오기 완료", "emerald");
          await get().refreshVersions();
        },

        // =========================================
        // 9) Version actions
        // =========================================
        refreshVersions: async () => {
          const state = get();

          if (!state.projectId) {
            set({ versions: [] });
            return;
          }

          if (!state.dbReady) {
            set({
              versions: [],
              saveStatus: "error",
              lastSaveError: "Supabase 환경변수가 설정되지 않았습니다.",
            });
            return;
          }

          set({ isVersionsBusy: true });

          const { data, error } = await fetchProjectVersions(state.projectId);

          if (error) {
            console.error(error);
            state.showToast("버전 목록 조회 실패", "red");
          } else {
            set({ versions: data || [] });
          }

          set({ isVersionsBusy: false });
        },

        restoreVersion: async (versionRow) => {
          const payload = versionRow?.payload || {};

          set({
            projectId: versionRow.project_id,
            projectName: payload.projectName || "복구된 프로젝트",
            activeTab: payload.activeTab || "pbx",
            itemsBySolution: payload.itemsBySolution || deepCloneItems(),
            scaleFactor: Number(payload.scaleFactor ?? 1),
            riskFactor: Number(payload.riskFactor ?? 1),
            mgmtRate: Number(payload.mgmtRate ?? 10),
            savedAt: payload.savedAt || "",
            isDirty: true,
            saveStatus: "dirty",
            lastSaveError: "",
          });

          get().showToast("버전 복구 완료", "emerald");
        },
      };
    },
    {
      name: "cc-effort-estimator-storage",
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        projectId: state.projectId,
        activeTab: state.activeTab,
        projectName: state.projectName,
        itemsBySolution: state.itemsBySolution,
        scaleFactor: state.scaleFactor,
        riskFactor: state.riskFactor,
        mgmtRate: state.mgmtRate,
        savedAt: state.savedAt,
        isDirty: state.isDirty,
      }),

      migrate: (persistedState) => {
        const fresh = createFreshProjectState();

        if (!persistedState || typeof persistedState !== "object") {
          return fresh;
        }

        return {
          ...fresh,
          ...persistedState,
          itemsBySolution:
            persistedState.itemsBySolution || fresh.itemsBySolution,
          activeTab: persistedState.activeTab || fresh.activeTab,
          projectName: persistedState.projectName || fresh.projectName,
          scaleFactor: Number(persistedState.scaleFactor ?? fresh.scaleFactor),
          riskFactor: Number(persistedState.riskFactor ?? fresh.riskFactor),
          mgmtRate: Number(persistedState.mgmtRate ?? fresh.mgmtRate),
          savedAt: persistedState.savedAt ?? fresh.savedAt,
          isDirty: Boolean(persistedState.isDirty),
        };
      },
    }
  )
);