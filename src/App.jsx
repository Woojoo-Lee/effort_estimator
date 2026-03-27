import React, { useEffect } from "react";

import HeaderBar from "./components/HeaderBar";
import ProjectListPanel from "./components/ProjectListPanel";
import DetailTable from "./components/DetailTable";
import RightSidebar from "./components/RightSidebar";
import Toast from "./components/Toast";
import SolutionTabs from "./components/SolutionTabs";
import SummaryView from "./components/SummaryView";

import { useExportManager } from "./hooks/useExportManager";
import { useEstimatorStore } from "./store/useEstimatorStore";

export default function ContactCenterEffortEstimator() {
  const {
    projectId,
    activeTab,
    projectName,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
    projects,
    isBusy,
    dbReady,
    isDirty,
    toast,

    setProjectId,
    setActiveTab,
    setProjectNameWithDirty,
    setItemsBySolution,
    setScaleFactor,
    setRiskFactor,
    setMgmtRate,
    setSavedAt,
    setIsDirty,

    markDirty,
    showToast,
    refreshProjects,
    updateItem,
    addItem,
    removeItem,
    createNewProject,
    handleSaveProject,
    loadProject,

    getSolutionTotals,
    getGrandBaseTotal,
    getScaledTotal,
    getRiskAppliedTotal,
    getMgmtMd,
    getFinalTotal,
    getCurrentItems,
  } = useEstimatorStore();

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const solutionTotals = getSolutionTotals();
  const grandBaseTotal = getGrandBaseTotal();
  const scaledTotal = getScaledTotal();
  const riskAppliedTotal = getRiskAppliedTotal();
  const mgmtMd = getMgmtMd();
  const finalTotal = getFinalTotal();
  const currentItems = getCurrentItems();

  const projectState = {
    projectName,
    activeTab,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
  };

  const calcState = {
    solutionTotals,
    grandBaseTotal,
    scaledTotal,
    riskAppliedTotal,
    mgmtMd,
    finalTotal,
  };

  const setters = {
    setProjectId,
    setActiveTab,
    setProjectName: setProjectNameWithDirty,
    setItemsBySolution,
    setScaleFactor,
    setRiskFactor,
    setMgmtRate,
    setSavedAt,
    setIsDirty,
  };

  const { downloadJson, downloadExcel, importJson } = useExportManager({
    projectState,
    calcState,
    setters,
  });

  const projectMeta = {
    projectId,
    projectName,
    savedAt,
  };

  const status = {
    isDirty,
    dbReady,
    isBusy,
  };

  const actions = {
    setProjectName: setProjectNameWithDirty,
    createNewProject: () => {
      createNewProject();
      showToast("새 프로젝트 작성 시작", "blue");
    },
    handleSaveProject,
    importJson,
    downloadJson,
    downloadExcel,
    resetAll: () => {
      createNewProject();
      showToast("초기화 완료", "blue");
    },
    showPrint: () => window.print(),
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)] p-6">
      <div className="mx-auto max-w-[1360px] space-y-5">
        <HeaderBar
          projectMeta={projectMeta}
          status={status}
          actions={actions}
        />

        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_2fr]">
          <ProjectListPanel
            projects={projects}
            projectId={projectId}
            loadProject={loadProject}
            refreshProjects={refreshProjects}
            dbReady={dbReady}
            isBusy={isBusy}
          />

          <SolutionTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {activeTab === "summary" ? (
          <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_0.9fr]">
            <SummaryView
              solutionTotals={solutionTotals}
              grandBaseTotal={grandBaseTotal}
            />

            <RightSidebar
              activeTab={activeTab}
              solutionTotals={solutionTotals}
              grandBaseTotal={grandBaseTotal}
              scaledTotal={scaledTotal}
              riskAppliedTotal={riskAppliedTotal}
              mgmtRate={mgmtRate}
              mgmtMd={mgmtMd}
              finalTotal={finalTotal}
              scaleFactor={scaleFactor}
              setScaleFactor={setScaleFactor}
              riskFactor={riskFactor}
              setRiskFactor={setRiskFactor}
              setMgmtRate={setMgmtRate}
              markDirty={markDirty}
              isSummary
            />
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_0.9fr]">
            <DetailTable
              activeTab={activeTab}
              currentItems={currentItems}
              updateItem={updateItem}
              addItem={(solutionKey) => {
                addItem(solutionKey);
                showToast("항목 추가 완료", "blue");
              }}
              removeItem={(solutionKey, index) => {
                removeItem(solutionKey, index);
                showToast("항목 삭제 완료", "blue");
              }}
            />

            <RightSidebar
              activeTab={activeTab}
              solutionTotals={solutionTotals}
              grandBaseTotal={grandBaseTotal}
              scaledTotal={scaledTotal}
              riskAppliedTotal={riskAppliedTotal}
              mgmtRate={mgmtRate}
              mgmtMd={mgmtMd}
              finalTotal={finalTotal}
              scaleFactor={scaleFactor}
              setScaleFactor={setScaleFactor}
              riskFactor={riskFactor}
              setRiskFactor={setRiskFactor}
              setMgmtRate={setMgmtRate}
              markDirty={markDirty}
            />
          </div>
        )}

        <div className="px-2 pb-2 pt-1 text-center text-xs text-slate-400">
          © 2026 Contact Center Estimation Workspace · Internal Planning Use
        </div>
      </div>

      <Toast message={toast.message} tone={toast.tone} />
    </div>
  );
}