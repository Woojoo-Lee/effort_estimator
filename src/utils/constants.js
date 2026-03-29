export const BRAND = {
  title: "컨택센터 개발공수 산정 Tool",
  subtitle: "Enterprise Estimation Workspace",
  version: "표준공수체계 V2.2",
  updatedAt: "최근 업데이트: 2026. 3. 26.",
};

export const SOLUTIONS = [
  { key: "summary", label: "전체 요약", icon: "📋" },
  { key: "pbx", label: "PBX (교환기)", icon: "☎️" },
  { key: "cti", label: "CTI", icon: "🎧" },
  { key: "ivr", label: "IVR", icon: "📞" },
  { key: "stats", label: "통계 (Stat)", icon: "📈" },
  { key: "wfm", label: "WFM", icon: "🗂️" },
  { key: "voicebot", label: "음성봇 (VoiceBot)", icon: "🤖" },
];

export const DEFAULT_ITEMS = {
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

export const difficultyOptions = [
  { value: 0.8, label: "하 (0.8)" },
  { value: 1.0, label: "중 (1.0)" },
  { value: 1.2, label: "상 (1.2)" },
];

export const complexityOptions = [
  { value: 0.9, label: "낮음 (0.9)" },
  { value: 1.0, label: "보통 (1.0)" },
  { value: 1.3, label: "높음 (1.3)" },
];

export const scaleOptions = [
  { value: 1.0, label: "표준규모 (1.0)" },
  { value: 1.2, label: "중형규모 (1.2)" },
  { value: 1.5, label: "대형규모 (1.5)" },
  { value: 1.8, label: "초대형 (1.8)" },
];

export const riskOptions = [
  { value: 1.0, label: "낮음 (1.0)" },
  { value: 1.1, label: "보통 (1.1)" },
  { value: 1.2, label: "높음 (1.2)" },
];

export const FILE_VERSION = "2.0";
export const TABLE_NAME = "estimation_projects";
export const VERSION_TABLE_NAME = "estimation_project_versions";