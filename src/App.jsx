// src/App.jsx
import React, { useEffect, useMemo } from "react";

import HeaderBar from "./components/HeaderBar";
import ProjectListPanel from "./components/ProjectListPanel";
import DetailTable from "./components/DetailTable";
import RightSidebar from "./components/RightSidebar";
import Toast from "./components/Toast";
import SolutionTabs from "./components/SolutionTabs";
import SummaryView from "./components/SummaryView";

import { useToast } from "./hooks/useToast";
import { useProjectManager } from "./hooks/useProjectManager";

import {
  buildExcelXml,
  downloadExcelFile,
  toExportPayload,
} from "./utils/excelExport";

import { readJsonFile, downloadJsonFile } from "./utils/jsonUtils";

import {
  deepCloneItems,
  calcSolutionTotals,
  calcGrandBaseTotal,
  calcScaledTotal,
  calcRiskAppliedTotal,
  calcMgmtMd,
  calcFinalTotal,
} from "./utils/estimatorMath";

export default function ContactCenterEffortEstimator() {
  const { toast, showToast } = useToast();

  const {
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
  } = useProjectManager(showToast);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const solutionTotals = useMemo(
    () => calcSolutionTotals(itemsBySolution),
    [itemsBySolution]
  );

  const grandBaseTotal = useMemo(
    () => calcGrandBaseTotal(solutionTotals),
    [solutionTotals]
  );

  const scaledTotal = useMemo(
    () => calcScaledTotal(grandBaseTotal, scaleFactor),
    [grandBaseTotal, scaleFactor]
  );

  const riskAppliedTotal = useMemo(
    () => calcRiskAppliedTotal(scaledTotal, riskFactor),
    [scaledTotal, riskFactor]
  );

  const mgmtMd = useMemo(
    () => calcMgmtMd(riskAppliedTotal, mgmtRate),
    [riskAppliedTotal, mgmtRate]
  );

  const finalTotal = useMemo(
    () => calcFinalTotal(riskAppliedTotal, mgmtMd),
    [riskAppliedTotal, mgmtMd]
  );

  const currentItems = itemsBySolution[activeTab] || [];

  const downloadJson = () => {
    try {
      const payload = {
        ...toExportPayload({
          activeTab,
          projectName,
          itemsBySolution,
          scaleFactor,
          riskFactor,
          mgmtRate,
          savedAt,
        }),
        exportedAt: new Date().toISOString(),
      };

      downloadJsonFile({
        projectName,
        payload,
      });

      showToast("JSON 파일 저장 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("JSON 저장 실패", "red");
    }
  };

  const downloadExcel = () => {
    try {
      const xml = buildExcelXml({
        projectName,
        activeTab,
        itemsBySolution,
        solutionTotals,
        grandBaseTotal,
        scaledTotal,
        riskAppliedTotal,
        mgmtRate,
        mgmtMd,
        finalTotal,
        scaleFactor,
        riskFactor,
        savedAt,
      });

      downloadExcelFile({
        projectName,
        xml,
      });

      showToast("엑셀 파일 저장 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("엑셀 저장 실패", "red");
    }
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await readJsonFile(file);
      const parsed = JSON.parse(text);

      if (!parsed.itemsBySolution || !parsed.projectName) {
        throw new Error("형식이 올바르지 않은 파일입니다.");
      }

      setProjectId(null);
      setActiveTab(parsed.activeTab || "pbx");
      setProjectName(parsed.projectName || "새 컨택센터 프로젝트");
      setItemsBySolution(parsed.itemsBySolution || deepCloneItems());
      setScaleFactor(Number(parsed.scaleFactor ?? 1.0));
      setRiskFactor(Number(parsed.riskFactor ?? 1.0));
      setMgmtRate(Number(parsed.mgmtRate ?? 10));
      setSavedAt(parsed.savedAt || "");
      setIsDirty(true);

      showToast("JSON 불러오기 완료", "emerald");
    } catch (error) {
      console.error(error);
      showToast("JSON 불러오기 실패", "red");
      alert("JSON 파일을 불러오지 못했습니다. 파일 형식을 확인해 주세요.");
    } finally {
      event.target.value = "";
    }
  };

  const resetAll = () => {
    createNewProject();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)] p-6">
      <div className="mx-auto max-w-[1360px] space-y-5">
        <HeaderBar
          projectId={projectId}
          projectName={projectName}
          setProjectName={(value) => {
            setProjectName(value);
            markDirty();
          }}
          savedAt={savedAt}
          isDirty={isDirty}
          dbReady={dbReady}
          isBusy={isBusy}
          createNewProject={createNewProject}
          handleSaveProject={handleSaveProject}
          importJson={importJson}
          downloadJson={downloadJson}
          downloadExcel={downloadExcel}
          resetAll={resetAll}
          showPrint={() => window.print()}
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
              addItem={addItem}
              removeItem={removeItem}
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