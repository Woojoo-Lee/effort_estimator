import React, { useEffect, useMemo, useState } from "react";

import HeaderBar from "./components/HeaderBar";
import ProjectListPanel from "./components/ProjectListPanel";
import DetailTable from "./components/DetailTable";
import RightSidebar from "./components/RightSidebar";
import Toast from "./components/Toast";
import SolutionTabs from "./components/SolutionTabs";
import SummaryView from "./components/SummaryView";
import VersionHistoryModal from "./components/VersionHistoryModal";

import { useExportManager } from "./hooks/useExportManager";
import { useEstimatorStore } from "./store/useEstimatorStore";
import { useHeaderModel } from "./hooks/useHeaderModel";
import { useProjectPanelModel } from "./hooks/useProjectPanelModel";
import { useEstimatorViewModel } from "./hooks/useEstimatorViewModel";
import { useToastState } from "./hooks/useToastState";
import { useAutoSave } from "./hooks/useAutoSave";
import { getAppVersion } from "./utils/appVersion";

function GlobalToast() {
  const toast = useToastState();
  return <Toast message={toast.message} tone={toast.tone} />;
}

export default function ContactCenterEffortEstimator() {
  const appVersion = getAppVersion();
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  useAutoSave();

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

  const refreshProjects = useEstimatorStore((s) => s.refreshProjects);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (isVersionModalOpen && projectId) {
      refreshVersions();
    }
  }, [isVersionModalOpen, projectId, refreshVersions]);

  const estimatorView = useEstimatorViewModel();
  const projectPanel = useProjectPanelModel();

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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)]">
      <div className="mx-auto max-w-[1360px] p-4">
        <div className="space-y-3">
          <HeaderBar
            projectMeta={projectMeta}
            status={status}
            actions={actions}
          />

          <ProjectListPanel
            projects={projectPanel.projects}
            projectId={projectPanel.projectId}
            loadProject={projectPanel.loadProject}
            refreshProjects={projectPanel.refreshProjects}
            dbReady={projectPanel.dbReady}
            isBusy={projectPanel.isBusy}
          />

          <SolutionTabs
            activeTab={estimatorView.activeTab}
            setActiveTab={estimatorView.setActiveTab}
          />
        </div>

        {estimatorView.activeTab === "summary" ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_340px] lg:items-stretch">
            <div className="min-w-0">
              <SummaryView
                solutionTotals={estimatorView.solutionTotals}
                grandBaseTotal={estimatorView.grandBaseTotal}
              />
            </div>

            <div className="min-w-0 lg:h-full">
              <RightSidebar {...estimatorView.sidebarModel} isSummary />
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_340px] lg:items-stretch">
            <div className="min-w-0 lg:h-full">
              <DetailTable
                activeTab={estimatorView.activeTab}
                currentItems={estimatorView.currentItems}
                updateItem={estimatorView.detailActions.updateItem}
                addItem={estimatorView.detailActions.addItem}
                removeItem={estimatorView.detailActions.removeItem}
              />
            </div>

            <div className="min-w-0 lg:h-full">
              <RightSidebar {...estimatorView.sidebarModel} />
            </div>
          </div>
        )}

        <div className="pt-3 text-center text-xs text-slate-400">
          © 2026 Contact Center Estimation Workspace · Internal Planning Use ·{" "}
          {appVersion}
        </div>
      </div>

      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        versions={versions}
        isLoading={isVersionsBusy}
        onRestore={handleRestoreVersion}
      />

      <GlobalToast />
    </div>
  );
}