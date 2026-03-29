import { useMemo } from "react";
import { useEstimatorStore } from "../store/useEstimatorStore";

export function useHeaderModel(importExportActions, versionActions = {}) {
  const projectId = useEstimatorStore((s) => s.projectId);
  const projectName = useEstimatorStore((s) => s.projectName);
  const savedAt = useEstimatorStore((s) => s.savedAt);

  const isDirty = useEstimatorStore((s) => s.isDirty);
  const dbReady = useEstimatorStore((s) => s.dbReady);
  const isBusy = useEstimatorStore((s) => s.isBusy);
  const saveStatus = useEstimatorStore((s) => s.saveStatus);

  const setProjectNameWithDirty = useEstimatorStore(
    (s) => s.setProjectNameWithDirty
  );
  const createNewProject = useEstimatorStore((s) => s.createNewProject);
  const handleSaveProject = useEstimatorStore((s) => s.handleSaveProject);
  const showToast = useEstimatorStore((s) => s.showToast);

  const projectMeta = useMemo(
    () => ({
      projectId,
      projectName,
      savedAt,
    }),
    [projectId, projectName, savedAt]
  );

  const status = useMemo(
    () => ({
      isDirty,
      dbReady,
      isBusy,
      saveStatus,
    }),
    [isDirty, dbReady, isBusy, saveStatus]
  );

  const actions = useMemo(
    () => ({
      setProjectName: setProjectNameWithDirty,
      createNewProject: () => {
        createNewProject();
        showToast("새 프로젝트 작성 시작", "blue");
      },
      handleSaveProject: () => handleSaveProject({ silent: false }),
      importJson: importExportActions.importJson,
      downloadJson: importExportActions.downloadJson,
      downloadExcel: importExportActions.downloadExcel,
      resetAll: () => {
        createNewProject();
        showToast("초기화 완료", "blue");
      },
      showPrint: () => window.print(),
      openVersionHistory:
        versionActions.openVersionHistory || (() => {}),
    }),
    [
      setProjectNameWithDirty,
      createNewProject,
      showToast,
      handleSaveProject,
      importExportActions.importJson,
      importExportActions.downloadJson,
      importExportActions.downloadExcel,
      versionActions.openVersionHistory,
    ]
  );

  return {
    projectMeta,
    status,
    actions,
  };
}