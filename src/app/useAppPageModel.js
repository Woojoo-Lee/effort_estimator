import { useEffect, useMemo, useState } from "react";

import { useExportManager } from "../hooks/useExportManager";
import { useEstimatorStore } from "../store/useEstimatorStore";
import { useHeaderModel } from "../hooks/useHeaderModel";
import { useProjectSelectorModel } from "../hooks/useProjectSelectorModel";
import { useEstimatorViewModel } from "../hooks/useEstimatorViewModel";
import { useProjectStore } from "../store/useProjectStore";

export function useAppPageModel() {
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  const projectId = useEstimatorStore((s) => s.projectId);
  const activeTab = useEstimatorStore((s) => s.activeTab);
  const projectName = useEstimatorStore((s) => s.projectName);
  const itemsBySolution = useEstimatorStore((s) => s.itemsBySolution);
  const scaleFactor = useEstimatorStore((s) => s.scaleFactor);
  const riskFactor = useEstimatorStore((s) => s.riskFactor);
  const mgmtRate = useEstimatorStore((s) => s.mgmtRate);
  const savedAt = useEstimatorStore((s) => s.savedAt);

  const versions = useEstimatorStore((s) => s.versions);
  const isVersionsBusy = useEstimatorStore((s) => s.isVersionsBusy);
  const refreshVersions = useEstimatorStore((s) => s.refreshVersions);
  const restoreVersion = useEstimatorStore((s) => s.restoreVersion);

  const setProjectId = useEstimatorStore((s) => s.setProjectId);
  const setActiveTab = useEstimatorStore((s) => s.setActiveTab);
  const setProjectNameWithDirty = useEstimatorStore(
    (s) => s.setProjectNameWithDirty
  );
  const setItemsBySolution = useEstimatorStore((s) => s.setItemsBySolution);
  const setScaleFactor = useEstimatorStore((s) => s.setScaleFactor);
  const setRiskFactor = useEstimatorStore((s) => s.setRiskFactor);
  const setMgmtRate = useEstimatorStore((s) => s.setMgmtRate);
  const setSavedAt = useEstimatorStore((s) => s.setSavedAt);
  const setIsDirty = useEstimatorStore((s) => s.setIsDirty);

  const refreshProjects = useProjectStore((s) => s.refreshProjects);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (isVersionModalOpen && projectId) {
      refreshVersions();
    }
  }, [isVersionModalOpen, projectId, refreshVersions]);

  const estimatorView = useEstimatorViewModel();
  const projectSelector = useProjectSelectorModel();

  const projectState = useMemo(
    () => ({
      projectName,
      activeTab,
      itemsBySolution,
      scaleFactor,
      riskFactor,
      mgmtRate,
      savedAt,
    }),
    [
      projectName,
      activeTab,
      itemsBySolution,
      scaleFactor,
      riskFactor,
      mgmtRate,
      savedAt,
    ]
  );

  const calcState = useMemo(
    () => ({
      solutionTotals: estimatorView.solutionTotals,
      grandBaseTotal: estimatorView.grandBaseTotal,
      scaledTotal: estimatorView.scaledTotal,
      riskAppliedTotal: estimatorView.riskAppliedTotal,
      mgmtMd: estimatorView.mgmtMd,
      finalTotal: estimatorView.finalTotal,
    }),
    [
      estimatorView.solutionTotals,
      estimatorView.grandBaseTotal,
      estimatorView.scaledTotal,
      estimatorView.riskAppliedTotal,
      estimatorView.mgmtMd,
      estimatorView.finalTotal,
    ]
  );

  const setters = useMemo(
    () => ({
      setProjectId,
      setActiveTab,
      setProjectName: setProjectNameWithDirty,
      setItemsBySolution,
      setScaleFactor,
      setRiskFactor,
      setMgmtRate,
      setSavedAt,
      setIsDirty,
    }),
    [
      setProjectId,
      setActiveTab,
      setProjectNameWithDirty,
      setItemsBySolution,
      setScaleFactor,
      setRiskFactor,
      setMgmtRate,
      setSavedAt,
      setIsDirty,
    ]
  );

  const importExportActions = useExportManager({
    projectState,
    calcState,
    setters,
  });

  const versionActions = useMemo(
    () => ({
      openVersionHistory: () => setIsVersionModalOpen(true),
    }),
    []
  );

  const { projectMeta, status, actions } = useHeaderModel(
    importExportActions,
    versionActions
  );

  async function handleRestoreVersion(version) {
    await restoreVersion(version);
    setIsVersionModalOpen(false);
  }

  return {
    isVersionModalOpen,
    setIsVersionModalOpen,
    versions,
    isVersionsBusy,
    handleRestoreVersion,
    projectMeta,
    status,
    actions,
    estimatorView,
    projectSelector,
  };
}