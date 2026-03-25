// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";

const BRAND = {
  title: "컨택센터 개발공수 산정 Tool",
  subtitle: "Enterprise Estimation Workspace",
  version: "표준공수체계 V2.0",
  updatedAt: "최근 업데이트: 2026. 3. 25.",
};

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

const STORAGE_KEY = "contact-center-effort-estimator:v1";

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
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${primary ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} ${props.className || ""}`}
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
      자동 저장 {savedAt || "대기 중"}
    </span>
  );
}

export default function ContactCenterEffortEstimator() {
  const [activeTab, setActiveTab] = useState("pbx");
  const [projectName, setProjectName] = useState("새 컨택센터 프로젝트");
  const [itemsBySolution, setItemsBySolution] = useState(deepCloneItems());
  const [scaleFactor, setScaleFactor] = useState(1.0);
  const [riskFactor, setRiskFactor] = useState(1.0);
  const [mgmtRate, setMgmtRate] = useState(10);
  const [savedAt, setSavedAt] = useState("");
  const [saveEnabled, setSaveEnabled] = useState(false);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSaveEnabled(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed.projectName) setProjectName(parsed.projectName);
      if (parsed.itemsBySolution) setItemsBySolution(parsed.itemsBySolution);
      if (typeof parsed.scaleFactor !== "undefined") setScaleFactor(Number(parsed.scaleFactor));
      if (typeof parsed.riskFactor !== "undefined") setRiskFactor(Number(parsed.riskFactor));
      if (typeof parsed.mgmtRate !== "undefined") setMgmtRate(Number(parsed.mgmtRate));
      if (parsed.activeTab) setActiveTab(parsed.activeTab);
      if (parsed.savedAt) setSavedAt(parsed.savedAt);
    } catch (error) {
      console.error("저장 데이터 불러오기 실패", error);
    } finally {
      setSaveEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!saveEnabled) return;
    try {
      const now = new Date();
      const label = now.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const payload = {
        activeTab,
        projectName,
        itemsBySolution,
        scaleFactor,
        riskFactor,
        mgmtRate,
        savedAt: label,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setSavedAt(label);
    } catch (error) {
      console.error("저장 실패", error);
    }
  }, [activeTab, projectName, itemsBySolution, scaleFactor, riskFactor, mgmtRate, saveEnabled]);

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

  const resetAll = () => {
    setProjectName("새 컨택센터 프로젝트");
    setItemsBySolution(deepCloneItems());
    setScaleFactor(1.0);
    setRiskFactor(1.0);
    setMgmtRate(10);
    setActiveTab("pbx");
    localStorage.removeItem(STORAGE_KEY);
    setSavedAt("");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)] p-6">
      <div className="mx-auto max-w-[1360px] space-y-5">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl text-white shadow-sm">
                📘
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[30px] font-extrabold tracking-tight text-slate-900">
                    {BRAND.title}
                  </div>
                  <StatusPill>{BRAND.version}</StatusPill>
                  <SavePill savedAt={savedAt} />
                </div>
                <div className="mt-1 text-sm font-medium text-slate-500">{BRAND.subtitle}</div>
                <div className="mt-1 text-sm text-slate-400">{BRAND.updatedAt}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SmallInput
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-[240px] bg-slate-50"
              />
              <ActionButton onClick={resetAll}>전체 초기화</ActionButton>
              <ActionButton primary onClick={() => window.print()}>
                PDF / 인쇄
              </ActionButton>
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
                          <td className="py-4 pr-4 pl-4 font-semibold text-slate-900">
                            {sol.icon} {sol.label}
                          </td>
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
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>규모 (Scale Factor)</span>
                      <span className="text-blue-600">{fmt(scaleFactor)}x</span>
                    </div>
                    <SmallSelect value={scaleFactor} onChange={(e) => setScaleFactor(Number(e.target.value))}>
                      {scaleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>리스크 (Risk Factor)</span>
                      <span className="text-blue-600">{fmt(riskFactor)}x</span>
                    </div>
                    <SmallSelect value={riskFactor} onChange={(e) => setRiskFactor(Number(e.target.value))}>
                      {riskOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>관리 비율 (Project Mgmt)</span>
                      <span className="text-blue-600">{mgmtRate}%</span>
                    </div>
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
            <Panel
              title="상세 업무 목록"
              right={<ActionButton primary onClick={() => addItem(activeTab)}>＋ 항목 추가</ActionButton>}
            >
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
                        <td className="py-2 pr-3 pl-4">
                          <SmallInput value={item.name} onChange={(e) => updateItem(activeTab, index, "name", e.target.value)} />
                        </td>
                        <td className="py-2 pr-3">
                          <SmallInput type="number" step="0.1" value={item.baseMd} onChange={(e) => updateItem(activeTab, index, "baseMd", Number(e.target.value || 0))} className="text-center font-semibold" />
                        </td>
                        <td className="py-2 pr-3">
                          <SmallSelect value={item.difficulty} onChange={(e) => updateItem(activeTab, index, "difficulty", Number(e.target.value))}>
                            {difficultyOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </SmallSelect>
                        </td>
                        <td className="py-2 pr-3">
                          <SmallSelect value={item.complexity} onChange={(e) => updateItem(activeTab, index, "complexity", Number(e.target.value))}>
                            {complexityOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </SmallSelect>
                        </td>
                        <td className="py-2 pr-3 text-right align-middle">
                          <div className="rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-600">{fmt(calcItemMd(item))}</div>
                        </td>
                        <td className="py-2 pr-3">
                          <SmallInput value={item.note} onChange={(e) => updateItem(activeTab, index, "note", e.target.value)} placeholder="비고 입력" />
                        </td>
                        <td className="py-2 pr-4 text-center">
                          <button onClick={() => removeItem(activeTab, index)} className="rounded-lg px-2 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-500">🗑️</button>
                        </td>
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
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>규모 (Scale Factor)</span>
                      <span className="text-blue-600">{fmt(scaleFactor)}x</span>
                    </div>
                    <SmallSelect value={scaleFactor} onChange={(e) => setScaleFactor(Number(e.target.value))}>
                      {scaleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>리스크 (Risk Factor)</span>
                      <span className="text-blue-600">{fmt(riskFactor)}x</span>
                    </div>
                    <SmallSelect value={riskFactor} onChange={(e) => setRiskFactor(Number(e.target.value))}>
                      {riskOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </SmallSelect>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                      <span>관리 비율 (Project Mgmt)</span>
                      <span className="text-blue-600">{mgmtRate}%</span>
                    </div>
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

        <div className="px-2 pb-2 pt-1 text-center text-xs text-slate-400">
          © 2026 Contact Center Estimation Workspace · Internal Planning Use
        </div>
      </div>
    </div>
  );
}
