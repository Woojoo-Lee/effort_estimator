import { useState, useCallback } from "react";

import {
  fetchProjects,
  fetchProjectById,
  saveProject,
} from "../services/projectService";

import { isSupabaseReady } from "../services/supabaseClient";

import {
  deepCloneItems,
  emptyProjectState,
} from "../utils/estimatorMath";

export function useProjectManager(showToast) {
  const initial = emptyProjectState();

  const [projectId, setProjectId] = useState(initial.id);
  const [activeTab, setActiveTab] = useState(initial.activeTab);
  const [projectName, setProjectName] = useState(initial.projectName);
  const [itemsBySolution, setItemsBySolution] = useState(initial.itemsBySolution);
  const [scaleFactor, setScaleFactor] = useState(initial.scaleFactor);
  const [riskFactor, setRiskFactor] = useState(initial.riskFactor);
  const [mgmtRate, setMgmtRate] = useState(initial.mgmtRate);
  const [savedAt, setSavedAt] = useState(initial.savedAt);

  const [projects, setProjects] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [dbReady, setDbReady] = useState(isSupabaseReady);
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!dbReady) {
      setDbReady(false);
      return;
    }

    setIsBusy(true);

    const { data, error } = await fetchProjects();

    if (error) {
      console.error(error);
      showToast("프로젝트 목록 조회 실패", "red");
    } else {
      setProjects(data || []);
      setDbReady(true);
    }

    setIsBusy(false);
  }, [dbReady, showToast]);

  const updateItem = useCallback((solutionKey, index, field, value) => {
    setItemsBySolution((prev) => {
      const next = { ...prev };
      next[solutionKey] = [...next[solutionKey]];
      next[solutionKey][index] = {
        ...next[solutionKey][index],
        [field]: value,
      };
      return next;
    });

    setIsDirty(true);
  }, []);

  const addItem = useCallback((solutionKey) => {
    setItemsBySolution((prev) => ({
      ...prev,
      [solutionKey]: [
        ...prev[solutionKey],
        {
          name: "새 업무",
          baseMd: 1,
          difficulty: 1,
          complexity: 1,
          note: "",
        },
      ],
    }));

    setIsDirty(true);
    showToast("항목 추가 완료", "blue");
  }, [showToast]);

  const removeItem = useCallback((solutionKey, index) => {
    setItemsBySolution((prev) => ({
      ...prev,
      [solutionKey]: prev[solutionKey].filter((_, i) => i !== index),
    }));

    setIsDirty(true);
    showToast("항목 삭제 완료", "blue");
  }, [showToast]);

  const createNewProject = useCallback(() => {
    const next = emptyProjectState();

    setProjectId(next.id);
    setActiveTab(next.activeTab);
    setProjectName(next.projectName);
    setItemsBySolution(next.itemsBySolution);
    setScaleFactor(next.scaleFactor);
    setRiskFactor(next.riskFactor);
    setMgmtRate(next.mgmtRate);
    setSavedAt("");
    setIsDirty(false);

    showToast("새 프로젝트 작성 시작", "blue");
  }, [showToast]);

  const handleSaveProject = useCallback(async () => {
    if (!dbReady) {
      showToast("Supabase 환경변수가 설정되지 않았습니다.", "red");
      return;
    }

    setIsBusy(true);

    const label = new Date().toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const { data, error } = await saveProject({
      projectId,
      activeTab,
      projectName,
      itemsBySolution,
      scaleFactor,
      riskFactor,
      mgmtRate,
      savedAt: label,
    });

    if (error) {
      console.error(error);
      showToast("DB 저장 실패", "red");
    } else {
      setProjectId(data.id);
      setSavedAt(label);
      setIsDirty(false);
      showToast(
        projectId ? "DB 업데이트 완료" : "신규 프로젝트 저장 완료",
        "emerald"
      );
      await refreshProjects();
    }

    setIsBusy(false);
  }, [
    dbReady,
    showToast,
    projectId,
    activeTab,
    projectName,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    refreshProjects,
  ]);

  const loadProject = useCallback(async (id) => {
    if (!dbReady) return;

    setIsBusy(true);

    const { data, error } = await fetchProjectById(id);

    if (error) {
      console.error(error);
      showToast("프로젝트 불러오기 실패", "red");
      setIsBusy(false);
      return;
    }

    const payload = data.payload || {};

    setProjectId(data.id);
    setProjectName(
      data.project_name || payload.projectName || "새 컨택센터 프로젝트"
    );
    setActiveTab(payload.activeTab || "pbx");
    setItemsBySolution(payload.itemsBySolution || deepCloneItems());
    setScaleFactor(Number(payload.scaleFactor ?? 1.0));
    setRiskFactor(Number(payload.riskFactor ?? 1.0));
    setMgmtRate(Number(payload.mgmtRate ?? 10));
    setSavedAt(
      payload.savedAt ||
        (data.updated_at
          ? new Date(data.updated_at).toLocaleString("ko-KR")
          : "")
    );
    setIsDirty(false);

    showToast("프로젝트 불러오기 완료", "emerald");
    setIsBusy(false);
  }, [dbReady, showToast]);

  return {
    projectId,
    setProjectId,
    activeTab,
    setActiveTab,
    projectName,
    setProjectName,
    itemsBySolution,
    setItemsBySolution,
    scaleFactor,
    setScaleFactor,
    riskFactor,
    setRiskFactor,
    mgmtRate,
    setMgmtRate,
    savedAt,
    setSavedAt,
    projects,
    isBusy,
    dbReady,
    isDirty,
    setIsDirty,
    markDirty,
    refreshProjects,
    updateItem,
    addItem,
    removeItem,
    createNewProject,
    handleSaveProject,
    loadProject,
  };
}