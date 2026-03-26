// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const BRAND = {
  title: "컨택센터 개발공수 산정 Tool",
  subtitle: "Enterprise Estimation Workspace",
  version: "표준공수체계 V2.1",
  updatedAt: "최근 업데이트: 2026. 3. 26.",
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const SOLUTIONS = [
  { key: "summary", label: "전체 요약", icon: "📋" },
  { key: "pbx", label: "PBX (교환기)", icon: "☎️" },
  { key: "cti", label: "CTI", icon: "🎧" },
  { key: "ivr", label: "IVR", icon: "📞" },
  { key: "stats", label: "통계 (Stat)", icon: "📈" },
  { key: "wfm", label: "WFM", icon: "🗂️" },
  { key: "voicebot", label: "음성봇 (VoiceBot)", icon: "🤖" },
];

const DEFAULT_ITEMS = {
  pbx: [
    { name: "기본 설치 및 구성", baseMd: 2, difficulty: 1, complexity: 1, note: "" },
    { name: "내선 번호 설계 및 구성", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "트렁크 라인 구성", baseMd: 2, difficulty: 1, complexity: 1, note: "" },
    { name: "다이얼플랜 구성", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "음성 서비스 ARS/AA", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
    { name: "회의통화 설정", baseMd: 2, difficulty: 1, complexity: 1, note: "" },
    { name: "녹취 연동 설정", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "CTI 연동 설정", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "IVR 연동 설정", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "장애처리 및 이중화 구성", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
    { name: "보안 설정", baseMd: 2, difficulty: 1, complexity: 1, note: "" },
    { name: "테스트 및 UAT", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
  ],
  cti: [
    { name: "CTI 서버 설치 및 구성", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "상담원 상태 연동", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "소프트폰 화면 구성", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
    { name: "호 이벤트 처리", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
    { name: "CRM 연동", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
  ],
  ivr: [
    { name: "IVR 서버 설치", baseMd: 3, difficulty: 1, complexity: 1, note: "" },
    { name: "시나리오 설계", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
    { name: "콜플로우 구성", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
    { name: "TTS/STT 연동", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
  ],
  stats: [
    { name: "실시간 현황판 구성", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
    { name: "이력 통계 화면", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
    { name: "리포트 개발", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
    { name: "ETL/배치 구성", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
  ],
  wfm: [
    { name: "예측 모델 설정", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
    { name: "스케줄 생성", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
    { name: "근태 및 예외 처리", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
    { name: "운영 리포트", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
  ],
  voicebot: [
    { name: "음성봇 시나리오 설계", baseMd: 6, difficulty: 1, complexity: 1, note: "" },
    { name: "NLU 의도/엔티티 정의", baseMd: 6, difficulty: 1, complexity: 1, note: "" },
    { name: "STT/TTS 연동", baseMd: 4, difficulty: 1, complexity: 1, note: "" },
    { name: "백엔드 연계", baseMd: 5, difficulty: 1, complexity: 1, note: "" },
  ],
};

const difficultyOptions = [
  { value: 0.8, label: "하 (0.8)" },
  { value: 1.0, label: "중 (1.0)" },
  { value: 1.2, label: "상 (1.2)" },
];

const complexityOptions = [
  { value: 0.9, label: "낮음 (0.9)" },
  { value: 1.0, label: "보통 (1.0)" },
  { value: 1.3, label: "높음 (1.3)" },
];

const scaleOptions = [
  { value: 1.0, label: "표준규모 (1.0)" },
  { value: 1.2, label: "중형규모 (1.2)" },
  { value: 1.5, label: "대형규모 (1.5)" },
  { value: 1.8, label: "초대형 (1.8)" },
];

const riskOptions = [
  { value: 1.0, label: "낮음 (1.0)" },
  { value: 1.1, label: "보통 (1.1)" },
  { value: 1.2, label: "높음 (1.2)" },
];

const FILE_VERSION = "2.0";
const TABLE_NAME = "estimation_projects";

function fmt(n) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function deepCloneItems() {
  return JSON.parse(JSON.stringify(DEFAULT_ITEMS));
}

function calcItemMd(item) {
  return Number(
    (
      Number(item.baseMd || 0) *
      Number(item.difficulty || 1) *
      Number(item.complexity || 1)
    ).toFixed(2)
  );
}

function calcSolutionTotal(items) {
  return Number(items.reduce((sum, item) => sum + calcItemMd(item), 0).toFixed(2));
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsText(file, "utf-8");
  });
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cell(value, type = "String", styleId = "") {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function row(cells) {
  return `<Row>${cells.join("")}</Row>`;
}

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

function buildExcelXml({
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
}) {
  const summaryRows = [];
  summaryRows.push(row([cell("프로젝트명", "String", "Header"), cell(projectName)]));
  summaryRows.push(row([cell("현재 탭", "String", "Header"), cell(activeTab)]));
  summaryRows.push(row([cell("저장 시각", "String", "Header"), cell(savedAt || "-")]));
  summaryRows.push(row([cell("", "String"), cell("")]));
  summaryRows.push(row([cell("솔루션", "String", "Header"), cell("기본 산정 합계(MD)", "String", "Header")]));
  SOLUTIONS.filter((s) => s.key !== "summary").forEach((sol) => {
    summaryRows.push(row([cell(sol.label), cell(solutionTotals[sol.key] || 0, "Number", "Number")]));
  });
  summaryRows.push(row([cell("", "String"), cell("")]));
  summaryRows.push(row([cell("규모 계수", "String", "Header"), cell(scaleFactor, "Number", "Number")]));
  summaryRows.push(row([cell("리스크 계수", "String", "Header"), cell(riskFactor, "Number", "Number")]));
  summaryRows.push(row([cell("관리 비율(%)", "String", "Header"), cell(mgmtRate, "Number", "Number")]));
  summaryRows.push(row([cell("기본 산정 소계", "String", "Header"), cell(grandBaseTotal, "Number", "Number")]));
  summaryRows.push(row([cell("규모 반영", "String", "Header"), cell(scaledTotal, "Number", "Number")]));
  summaryRows.push(row([cell("리스크 반영", "String", "Header"), cell(riskAppliedTotal, "Number", "Number")]));
  summaryRows.push(row([cell("관리 공수", "String", "Header"), cell(mgmtMd, "Number", "Number")]));
  summaryRows.push(row([cell("최종 산출 공수", "String", "Header"), cell(finalTotal, "Number", "Number")]));

  const detailRows = [];
  Object.entries(itemsBySolution).forEach(([solutionKey, items]) => {
    const sol = SOLUTIONS.find((s) => s.key === solutionKey);
    detailRows.push(row([cell(sol?.label || solutionKey, "String", "Section")]));
    detailRows.push(
      row([
        cell("업무 기능", "String", "Header"),
        cell("기본공수(MD)", "String", "Header"),
        cell("난이도", "String", "Header"),
        cell("복잡도", "String", "Header"),
        cell("산정공수(MD)", "String", "Header"),
        cell("비고", "String", "Header"),
      ])
    );
    items.forEach((item) => {
      detailRows.push(
        row([
          cell(item.name),
          cell(item.baseMd, "Number", "Number"),
          cell(item.difficulty, "Number", "Number"),
          cell(item.complexity, "Number", "Number"),
          cell(calcItemMd(item), "Number", "Number"),
          cell(item.note || ""),
        ])
      );
    });
    detailRows.push(row([cell("소계", "String", "Header"), cell(solutionTotals[solutionKey] || 0, "Number", "Number")]));
    detailRows.push(row([cell("", "String")]));
  });

  return `${EXCEL_XML_HEADER}
 <Worksheet ss:Name="Summary">
  <Table>${summaryRows.join("")}</Table>
 </Worksheet>
 <Worksheet ss:Name="Details">
  <Table>${detailRows.join("")}</Table>
 </Worksheet>
</Workbook>`;
}

function emptyProjectState() {
  return {
    id: null,
    activeTab: "pbx",
    projectName: "새 컨택센터 프로젝트",
    itemsBySolution: deepCloneItems(),
    scaleFactor: 1.0,
    riskFactor: 1.0,
    mgmtRate: 10,
    savedAt: "",
  };
}

function toPayload({ activeTab, projectName, itemsBySolution, scaleFactor, riskFactor, mgmtRate, savedAt }) {
  return {
    fileVersion: FILE_VERSION,
    activeTab,
    projectName,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
  };
}

function Panel({ title, children, right, subtle = false }) {
  return (
    <div className={`overflow-hidden rounded-[28px] border ${subtle ? "border-blue-100 bg-gradient-to-br from-white to-blue-50/40" : "border-slate-200 bg-white"} shadow-[0_12px_32px_rgba(15,23,42,0.05)]`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ActionButton({ children, primary = false, ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${primary ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-300"} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

function SmallInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 ${props.className || ""}`}
    />
  );
}

function SmallSelect({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 ${props.className || ""}`}
    >
      {children}
    </select>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  const styles =
    tone === "primary"
      ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-700"
      : tone === "dark"
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-3xl border p-4 ${styles}`}>
      <div className={`text-xs font-semibold uppercase tracking-[0.08em] ${tone === "dark" ? "text-slate-300" : "text-slate-400"}`}>{label}</div>
      <div className="mt-2 text-[28px] font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function StatusPill({ children }) {
  return (
    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      {children}
    </span>
  );
}

function SavePill({ savedAt }) {
  return (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      최근 저장 {savedAt || "없음"}
    </span>
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
  const [projects, setProjects] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [dbReady, setDbReady] = useState(Boolean(supabase));

  const solutionTotals = useMemo(() => {
    const result = {};
    Object.keys(DEFAULT_ITEMS).forEach((key) => {
      result[key] = calcSolutionTotal(itemsBySolution[key] || []);
    });
    return result;
  }, [itemsBySolution]);

  const grandBaseTotal = useMemo(
    () => Object.values(solutionTotals).reduce((sum, n) => sum + n, 0),
    [solutionTotals]
  );
  const scaledTotal = useMemo(
    () => Number((grandBaseTotal * Number(scaleFactor)).toFixed(2)),
    [grandBaseTotal, scaleFactor]
  );
  const riskAppliedTotal = useMemo(
    () => Number((scaledTotal * Number(riskFactor)).toFixed(2)),
    [scaledTotal, riskFactor]
  );
  const mgmtMd = useMemo(
    () => Number((riskAppliedTotal * (Number(mgmtRate) / 100)).toFixed(2)),
    [riskAppliedTotal, mgmtRate]
  );
  const finalTotal = useMemo(
    () => Number((riskAppliedTotal + mgmtMd).toFixed(2)),
    [riskAppliedTotal, mgmtMd]
  );

  const currentItems = itemsBySolution[activeTab] || [];

  const refreshProjects = async () => {
    if (!supabase) {
      setDbReady(false);
      return;
    }
    setIsBusy(true);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, project_name, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("프로젝트 목록 조회 실패");
    } else {
      setProjects(data || []);
      setDbReady(true);
    }
    setIsBusy(false);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const updateItem = (solutionKey, index, field, value) => {
    setItemsBySolution((prev) => {
      const next = { ...prev };
      next[solutionKey] = [...next[solutionKey]];
      next[solutionKey][index] = { ...next[solutionKey][index], [field]: value };
      return next;
    });
  };

  const addItem = (solutionKey) => {
    setItemsBySolution((prev) => ({
      ...prev,
      [solutionKey]: [
        ...prev[solutionKey],
        { name: "새 업무", baseMd: 1, difficulty: 1, complexity: 1, note: "" },
      ],
    }));
  };

  const removeItem = (solutionKey, index) => {
    setItemsBySolution((prev) => ({
      ...prev,
      [solutionKey]: prev[solutionKey].filter((_, i) => i !== index),
    }));
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
      setMessage("JSON 파일 저장 완료");
    } catch (error) {
      console.error(error);
      setMessage("JSON 저장 실패");
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
      setMessage("엑셀 파일 저장 완료");
    } catch (error) {
      console.error(error);
      setMessage("엑셀 저장 실패");
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
      setMessage("JSON 불러오기 완료");
    } catch (error) {
      console.error(error);
      setMessage("JSON 불러오기 실패");
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
    setMessage("새 프로젝트 작성 시작");
  };

  const saveProject = async () => {
    if (!supabase) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다.");
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

    const payload = toPayload({
      activeTab,
      projectName,
      itemsBySolution,
      scaleFactor,
      riskFactor,
      mgmtRate,
      savedAt: label,
    });

    const rowData = {
      project_name: projectName,
      payload,
    };

    let result;
    if (projectId) {
      result = await supabase
        .from(TABLE_NAME)
        .update(rowData)
        .eq("id", projectId)
        .select("id, updated_at")
        .single();
    } else {
      result = await supabase
        .from(TABLE_NAME)
        .insert(rowData)
        .select("id, updated_at")
        .single();
    }

    if (result.error) {
      console.error(result.error);
      setMessage("DB 저장 실패");
    } else {
      setProjectId(result.data.id);
      setSavedAt(label);
      setMessage(projectId ? "DB 저장 완료" : "신규 프로젝트 저장 완료");
      await refreshProjects();
    }
    setIsBusy(false);
  };

  const loadProject = async (id) => {
    if (!supabase) return;
    setIsBusy(true);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, project_name, payload, updated_at")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      setMessage("프로젝트 불러오기 실패");
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
    setSavedAt(payload.savedAt || data.updated_at || "");
    setMessage("프로젝트 불러오기 완료");
    setIsBusy(false);
  };

  const resetAll = () => {
    createNewProject();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)] p-6">
      <div className="mx-auto max-w-[1360px] space-y-5">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl text-white shadow-sm">📘</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[30px] font-extrabold tracking-tight text-slate-900">{BRAND.title}</div>
                  <StatusPill>{BRAND.version}</StatusPill>
                  <SavePill savedAt={savedAt} />
                  {projectId ? <StatusPill>DB 저장 프로젝트</StatusPill> : null}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-500">{BRAND.subtitle}</div>
                <div className="mt-1 text-sm text-slate-400">{BRAND.updatedAt}</div>
                {message ? <div className="mt-2 text-xs font-semibold text-blue-600">{message}</div> : null}
                {!dbReady ? <div className="mt-1 text-xs font-semibold text-red-500">Supabase 연결 정보가 없어서 DB 기능이 비활성화되었습니다.</div> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SmallInput value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-[240px] bg-slate-50" />
              <ActionButton onClick={createNewProject}>새 프로젝트</ActionButton>
              <ActionButton primary onClick={saveProject} disabled={!dbReady || isBusy}>{projectId ? "DB 업데이트" : "DB 저장"}</ActionButton>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                JSON 불러오기
                <input type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
              </label>
              <ActionButton onClick={downloadJson}>JSON 저장</ActionButton>
              <ActionButton onClick={downloadExcel}>엑셀 저장</ActionButton>
              <ActionButton onClick={resetAll}>초기화</ActionButton>
              <ActionButton onClick={() => window.print()}>PDF / 인쇄</ActionButton>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard label="PBX" value={`${fmt(solutionTotals.pbx || 0)} MD`} />
              <MetricCard label="CTI" value={`${fmt(solutionTotals.cti || 0)} MD`} />
              <MetricCard label="IVR" value={`${fmt(solutionTotals.ivr || 0)} MD`} />
              <MetricCard label="통계" value={`${fmt(solutionTotals.stats || 0)} MD`} />
              <MetricCard label="WFM" value={`${fmt(solutionTotals.wfm || 0)} MD`} />
              <MetricCard label="VoiceBot" value={`${fmt(solutionTotals.voicebot || 0)} MD`} tone="primary" />
            </div>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_2fr]">
          <Panel title="DB 프로젝트 목록" subtle right={<ActionButton onClick={refreshProjects} disabled={!dbReady || isBusy}>새로고침</ActionButton>}>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  저장된 프로젝트가 없습니다.
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => loadProject(project.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:bg-slate-50 ${projectId === project.id ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="font-semibold text-slate-900">{project.project_name}</div>
                    <div className="mt-1 text-xs text-slate-500">ID: {project.id}</div>
                    <div className="mt-1 text-xs text-slate-400">업데이트: {project.updated_at ? new Date(project.updated_at).toLocaleString("ko-KR") : "-"}</div>
                  </button>
                ))
              )}
            </div>
          </Panel>

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

            <div className="space-y-5 lg:sticky lg:top-6">
              <Panel title="환경 변수 설정" subtle>
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800"><span>규모 (Scale Factor)</span><span className="text-blue-600">{fmt(scaleFactor)}x</span></div>
                    <SmallSelect value={scaleFactor} onChange={(e) => setScaleFactor(Number(e.target.value))}>
                      {scaleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800"><span>리스크 (Risk Factor)</span><span className="text-blue-600">{fmt(riskFactor)}x</span></div>
                    <SmallSelect value={riskFactor} onChange={(e) => setRiskFactor(Number(e.target.value))}>
                      {riskOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800"><span>관리 비율 (Project Mgmt)</span><span className="text-blue-600">{mgmtRate}%</span></div>
                    <div className="flex items-center gap-2">
                      <SmallInput type="number" value={mgmtRate} onChange={(e) => setMgmtRate(Number(e.target.value || 0))} />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="공수 산출 요약" subtle>
                <div className="space-y-3 text-sm leading-6">
                  <div className="flex items-center justify-between"><span className="text-slate-500">기본 산정 소계</span><strong>{fmt(grandBaseTotal)} MD</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">규모 반영</span><strong>{fmt(scaledTotal)} MD</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">리스크 반영</span><strong>{fmt(riskAppliedTotal)} MD</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">관리 공수 ({mgmtRate}%)</span><strong>{fmt(mgmtMd)} MD</strong></div>
                  <div className="mt-4 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
                    <div className="mb-2 text-sm font-bold text-blue-600">최종 산출 공수</div>
                    <div className="text-[52px] font-extrabold leading-none tracking-tight text-blue-600">{fmt(finalTotal)}<span className="ml-2 text-[28px]">MD</span></div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_0.9fr]">
            <Panel title="상세 업무 목록" right={<ActionButton primary onClick={() => addItem(activeTab)}>＋ 항목 추가</ActionButton>}>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full border-collapse bg-white">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                      <th className="py-3 pr-3 pl-4">업무 기능</th>
                      <th className="py-3 pr-3 text-center">기본공수(MD)</th>
                      <th className="py-3 pr-3 text-center">난이도</th>
                      <th className="py-3 pr-3 text-center">복잡도</th>
                      <th className="py-3 pr-3 text-right">산정공수</th>
                      <th className="py-3 pr-3">비고</th>
                      <th className="py-3 pr-4 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => (
                      <tr key={`${activeTab}-${index}`} className="border-b border-slate-100 align-top text-sm">
                        <td className="py-2 pr-3 pl-4"><SmallInput value={item.name} onChange={(e) => updateItem(activeTab, index, "name", e.target.value)} /></td>
                        <td className="py-2 pr-3"><SmallInput type="number" step="0.1" value={item.baseMd} onChange={(e) => updateItem(activeTab, index, "baseMd", Number(e.target.value || 0))} className="text-center font-semibold" /></td>
                        <td className="py-2 pr-3"><SmallSelect value={item.difficulty} onChange={(e) => updateItem(activeTab, index, "difficulty", Number(e.target.value))}>{difficultyOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</SmallSelect></td>
                        <td className="py-2 pr-3"><SmallSelect value={item.complexity} onChange={(e) => updateItem(activeTab, index, "complexity", Number(e.target.value))}>{complexityOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</SmallSelect></td>
                        <td className="py-2 pr-3 text-right align-middle"><div className="rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-600">{fmt(calcItemMd(item))}</div></td>
                        <td className="py-2 pr-3"><SmallInput value={item.note} onChange={(e) => updateItem(activeTab, index, "note", e.target.value)} placeholder="비고 입력" /></td>
                        <td className="py-2 pr-4 text-center"><button onClick={() => removeItem(activeTab, index)} className="rounded-lg px-2 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-500">🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="space-y-5 lg:sticky lg:top-6">
              <Panel title="환경 변수 설정" subtle>
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800"><span>규모 (Scale Factor)</span><span className="text-blue-600">{fmt(scaleFactor)}x</span></div>
                    <SmallSelect value={scaleFactor} onChange={(e) => setScaleFactor(Number(e.target.value))}>{scaleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800"><span>리스크 (Risk Factor)</span><span className="text-blue-600">{fmt(riskFactor)}x</span></div>
                    <SmallSelect value={riskFactor} onChange={(e) => setRiskFactor(Number(e.target.value))}>{riskOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800"><span>관리 비율 (Project Mgmt)</span><span className="text-blue-600">{mgmtRate}%</span></div>
                    <div className="flex items-center gap-2">
                      <SmallInput type="number" value={mgmtRate} onChange={(e) => setMgmtRate(Number(e.target.value || 0))} />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="공수 산출 요약" subtle>
                <div className="space-y-3 text-sm leading-6">
                  <div className="flex items-center justify-between"><span className="text-slate-500">현재 탭 소계</span><strong>{fmt(solutionTotals[activeTab] || 0)} MD</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">전체 기본 산정</span><strong>{fmt(grandBaseTotal)} MD</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">규모 반영</span><strong>{fmt(scaledTotal)} MD</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">리스크 반영</span><strong>{fmt(riskAppliedTotal)} MD</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">관리 공수 ({mgmtRate}%)</span><strong>{fmt(mgmtMd)} MD</strong></div>
                  <div className="mt-4 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
                    <div className="mb-2 text-sm font-bold text-blue-600">최종 산출 공수</div>
                    <div className="text-[52px] font-extrabold leading-none tracking-tight text-blue-600">{fmt(finalTotal)}<span className="ml-2 text-[28px]">MD</span></div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        <div className="px-2 pb-2 pt-1 text-center text-xs text-slate-400">© 2026 Contact Center Estimation Workspace · Internal Planning Use</div>
      </div>
    </div>
  );
}
