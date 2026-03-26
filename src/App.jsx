// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

import HeaderBar from "./components/HeaderBar";
import ProjectListPanel from "./components/ProjectListPanel";
import DetailTable from "./components/DetailTable";
import RightSidebar from "./components/RightSidebar";

import { SOLUTIONS } from "./utils/constants";

import {
  fmt,
  deepCloneItems,
  calcSolutionTotals,
  calcGrandBaseTotal,
  calcScaledTotal,
  calcRiskAppliedTotal,
  calcMgmtMd,
  calcFinalTotal,
  emptyProjectState,
} from "./utils/estimatorMath";

import {
  fetchProjects,
  fetchProjectById,
  saveProject,
  toPayload,
} from "./services/projectService";

import { isSupabaseReady } from "./services/supabaseClient";

const EXCEL_XML_HEADER = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DCEBFF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Section"><Font ss:Bold="1"/><Interior ss:Color="#EEF4FF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Number"><NumberFormat ss:Format="0.00"/></Style>
 </Styles>`;

function Toast({ message, tone = "blue" }) {
  if (!message) return null;
  const classes = tone === "red"
    ? "border-red-200 bg-red-50 text-red-700"
    : tone === "emerald"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-blue-200 bg-blue-50 text-blue-700";
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg ${classes}`}>
      {message}
    </div>
  );
}

export default function ContactCenterEffortEstimator() {
  const initial = emptyProjectState();
  const [projectId, setProjectId] = useState(initial.id);
  const [activeTab, setActiveTab] = useState(initial.activeTab);
  const [projectName, setProjectName] = useState(initial.projectName);
  const [itemsBySolution, setItemsBySolution] = useState(initial.itemsBySolution);
  const [scaleFactor, setScaleFactor] = useState(initial.scaleFactor);
  const [riskFactor, setRiskFactor] = useState(initial.riskFactor);
  const [mgmtRate, setMgmtRate] = useState(initial.mgmtRate);
  const [savedAt, setSavedAt] = useState(initial.savedAt);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("blue");
  const [projects, setProjects] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [dbReady, setDbReady] = useState(isSupabaseReady);
  const [isDirty, setIsDirty] = useState(false);
  const toastTimerRef = useRef(null);

  const showToast = (text, tone = "blue") => {
    setMessage(text);
    setMessageTone(tone);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setMessage(""), 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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

  const refreshProjects = async () => {
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
};

  useEffect(() => {
    refreshProjects();
  }, []);

  const markDirty = () => setIsDirty(true);

  const updateItem = (solutionKey, index, field, value) => {
    setItemsBySolution((prev) => {
      const next = { ...prev };
      next[solutionKey] = [...next[solutionKey]];
      next[solutionKey][index] = { ...next[solutionKey][index], [field]: value };
      return next;
    });
    markDirty();
  };

  const addItem = (solutionKey) => {
    setItemsBySolution((prev) => ({
      ...prev,
      [solutionKey]: [
        ...prev[solutionKey],
        { name: "새 업무", baseMd: 1, difficulty: 1, complexity: 1, note: "" },
      ],
    }));
    markDirty();
    showToast("항목 추가 완료", "blue");
  };

  const removeItem = (solutionKey, index) => {
    setItemsBySolution((prev) => ({
      ...prev,
      [solutionKey]: prev[solutionKey].filter((_, i) => i !== index),
    }));
    markDirty();
    showToast("항목 삭제 완료", "blue");
  };

  const downloadJson = () => {
    try {
      const payload = {
        ...toPayload({ activeTab, projectName, itemsBySolution, scaleFactor, riskFactor, mgmtRate, savedAt }),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeProjectName = (projectName || "contact-center-project").replace(/[\/:*?"<>|]/g, "-");
      link.href = url;
      link.download = `${safeProjectName}-effort-estimate.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
      const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeProjectName = (projectName || "contact-center-project").replace(/[\/:*?"<>|]/g, "-");
      link.href = url;
      link.download = `${safeProjectName}-effort-estimate.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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

  const createNewProject = () => {
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
  };

  const handleSaveProject = async () => {
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
    showToast(projectId ? "DB 업데이트 완료" : "신규 프로젝트 저장 완료", "emerald");
    await refreshProjects();
  }

  setIsBusy(false);
};  

  const loadProject = async (id) => {
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
  setProjectName(data.project_name || payload.projectName || "새 컨택센터 프로젝트");
  setActiveTab(payload.activeTab || "pbx");
  setItemsBySolution(payload.itemsBySolution || deepCloneItems());
  setScaleFactor(Number(payload.scaleFactor ?? 1.0));
  setRiskFactor(Number(payload.riskFactor ?? 1.0));
  setMgmtRate(Number(payload.mgmtRate ?? 10));
  setSavedAt(
    payload.savedAt || (data.updated_at ? new Date(data.updated_at).toLocaleString("ko-KR") : "")
  );
  setIsDirty(false);
  showToast("프로젝트 불러오기 완료", "emerald");
  setIsBusy(false);
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

          <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {SOLUTIONS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "border border-blue-200 bg-gradient-to-b from-white to-blue-50 text-slate-900 shadow-sm"
                      : "bg-transparent text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === "summary" ? (
          <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_0.9fr]">
            <Panel title="솔루션별 공수 요약" subtle>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full border-collapse bg-white">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                      <th className="py-3 pr-4 pl-4">솔루션</th>
                      <th className="py-3 pr-4 text-right">기본 산정 합계</th>
                      <th className="py-3 pr-4 text-right">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SOLUTIONS.filter((s) => s.key !== "summary").map((sol) => {
                      const total = solutionTotals[sol.key] || 0;
                      const ratio = grandBaseTotal > 0 ? (total / grandBaseTotal) * 100 : 0;
                      return (
                        <tr key={sol.key} className="border-b border-slate-100 text-sm">
                          <td className="py-4 pr-4 pl-4 font-semibold text-slate-900">{sol.icon} {sol.label}</td>
                          <td className="py-4 pr-4 text-right text-slate-800">{fmt(total)} MD</td>
                          <td className="py-4 pr-4 text-right text-slate-500">{fmt(ratio)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

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

        <div className="px-2 pb-2 pt-1 text-center text-xs text-slate-400">© 2026 Contact Center Estimation Workspace · Internal Planning Use</div>
      </div>
      <Toast message={message} tone={messageTone} />
    </div>
  );
}
