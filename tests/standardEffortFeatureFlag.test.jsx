// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import EstimatorPage from "../src/features/estimator/pages/EstimatorPage";

const mockPage = vi.hoisted(() => ({
  value: null,
}));

vi.mock("../src/app/useAppPageModel", () => ({
  useAppPageModel: () => mockPage.value,
}));

vi.mock("../src/hooks/useAutoSave", () => ({
  useAutoSave: vi.fn(),
}));

vi.mock("../src/shared/lib/appVersion", () => ({
  getAppVersion: () => "test-version",
}));

vi.mock("../src/features/layout/components/HeaderBar", () => ({
  default: () => <div data-testid="header-bar" />,
}));

vi.mock("../src/features/projects/components/ProjectSelectorBar", () => ({
  default: () => <div data-testid="project-selector" />,
}));

vi.mock("../src/features/estimator/components/DetailTable", () => ({
  default: ({ readOnly }) => (
    <div data-testid="detail-table" data-readonly={String(readOnly)} />
  ),
}));

vi.mock("../src/features/layout/components/RightSidebar", () => ({
  default: ({ readOnly }) => (
    <div data-testid="right-sidebar" data-readonly={String(readOnly)} />
  ),
}));

vi.mock("../src/features/estimator/components/SolutionTabs", () => ({
  default: () => <div data-testid="solution-tabs" />,
}));

vi.mock("../src/features/estimator/components/SummaryView", () => ({
  default: () => <div data-testid="summary-view" />,
}));

vi.mock("../src/features/projects/components/VersionHistoryModal", () => ({
  default: () => <div data-testid="version-history-modal" />,
}));

vi.mock("../src/features/estimator/components/standard", () => ({
  StandardEffortSection: ({ projectId, readOnly }) => (
    <div
      data-testid="standard-effort-section"
      data-readonly={String(readOnly)}
    >
      {projectId}
    </div>
  ),
}));

function createPageModel(projectId = 42, activeTab = "summary", overrides = {}) {
  return {
    isVersionModalOpen: false,
    setIsVersionModalOpen: vi.fn(),
    versions: [],
    isVersionsBusy: false,
    handleRestoreVersion: vi.fn(),
    projectMeta: {},
    status: {},
    actions: {},
    estimatorView: {
      activeTab,
      setActiveTab: vi.fn(),
      solutionTotals: {},
      grandBaseTotal: 0,
      sidebarModel: {},
      currentItems: [
        {
          name: "Sample",
          baseMd: 1,
          difficulty: 1,
          complexity: 1,
          note: "",
        },
      ],
      detailActions: {
        updateItem: vi.fn(),
        addItem: vi.fn(),
        removeItem: vi.fn(),
      },
      baseEffortMetaRows: [],
      itemFieldMetaRows: [],
      standardEffort: {},
      standardEffortActions: {},
    },
    projectSelector: {
      projects: [],
      projectId,
      loadProject: vi.fn(),
      refreshProjects: vi.fn(),
      dbReady: true,
      isBusy: false,
    },
    ...overrides,
  };
}

describe("EstimatorPage standard effort feature flag", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders legacy and standard effort sections in parallel mode", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "parallel");

    render(<EstimatorPage />);

    expect(screen.getByTestId("standard-effort-section").textContent).toBe(
      "42"
    );
    expect(screen.getByTestId("solution-tabs")).toBeTruthy();
    expect(screen.getByTestId("summary-view")).toBeTruthy();
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("renders only the legacy estimator when the flag is false", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "false");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");

    render(<EstimatorPage />);

    expect(screen.queryByTestId("standard-effort-section")).toBeNull();
    expect(screen.getByTestId("solution-tabs")).toBeTruthy();
    expect(screen.getByTestId("summary-view")).toBeTruthy();
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("renders only the legacy estimator when mode is legacy", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "legacy");

    render(<EstimatorPage />);

    expect(screen.queryByTestId("standard-effort-section")).toBeNull();
    expect(
      screen.queryByText("현재 화면은 엑셀 표준공수표 기준의 신규 산정 방식입니다.")
    ).toBeNull();
    expect(screen.getByTestId("summary-view")).toBeTruthy();
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("renders standard effort as the primary section and keeps legacy collapsed in standard mode", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");

    render(<EstimatorPage />);

    const standardSection = screen.getByTestId("standard-effort-section");
    const legacySummary = screen.getByText("기존 산출 화면");

    expect(
      screen.getByText("현재 화면은 엑셀 표준공수표 기준의 신규 산정 방식입니다.")
    ).toBeTruthy();
    expect(
      screen.getByText(
        "기존 산출 화면은 아래 접기 영역에서 비교용으로 확인할 수 있습니다."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "상단의 Excel 다운로드 버튼으로 표준공수 결과를 내보낼 수 있습니다."
      )
    ).toBeTruthy();
    expect(
      screen.queryByText("표준공수 결과 내보내기는 후속 단계에서 제공 예정입니다.")
    ).toBeNull();
    expect(standardSection.textContent).toBe("42");
    expect(legacySummary).toBeTruthy();
    expect(
      standardSection.compareDocumentPosition(legacySummary) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByText(
        /신규 표준공수 산식 전환 전 비교용 화면입니다.*비교용으로 보존/
      )
    ).toBeTruthy();
    expect(screen.getByTestId("solution-tabs")).toBeTruthy();
    expect(screen.getByTestId("summary-view")).toBeTruthy();
    expect(screen.queryByTestId("right-sidebar")).toBeNull();
  });

  it("shows available standard effort export guidance in standard mode with Supabase backend", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");

    render(<EstimatorPage />);

    expect(
      screen.getByText(
        "상단의 Excel 다운로드 버튼으로 표준공수 결과를 내보낼 수 있습니다."
      )
    ).toBeTruthy();
    expect(
      screen.queryByText("표준공수 결과 내보내기는 후속 단계에서 제공 예정입니다.")
    ).toBeNull();
  });

  it("uses parallel mode for unknown mode values", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "oops");

    render(<EstimatorPage />);

    expect(screen.getByTestId("standard-effort-section")).toBeTruthy();
    expect(screen.getByTestId("summary-view")).toBeTruthy();
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("passes readOnly=true to the standard effort section for dev viewers without write permissions", async () => {
    const { AuthPermissionProvider, PERMISSIONS } = await import(
      "../src/features/auth"
    );
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.ROUTE_ESTIMATOR_READ,
        }}
      >
        <EstimatorPage />
      </AuthPermissionProvider>
    );

    expect(screen.getByTestId("standard-effort-section").dataset.readonly).toBe(
      "true"
    );
  });

  it("passes readOnly=false to the standard effort section for dev estimators with write permissions", async () => {
    const { AuthPermissionProvider, PERMISSIONS } = await import(
      "../src/features/auth"
    );
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: [
            PERMISSIONS.ROUTE_ESTIMATOR_READ,
            PERMISSIONS.STANDARD_EFFORT_SELECTION_WRITE,
          ].join(","),
        }}
      >
        <EstimatorPage />
      </AuthPermissionProvider>
    );

    await screen.findByTestId("standard-effort-section");
    expect(screen.getByTestId("standard-effort-section").dataset.readonly).toBe(
      "false"
    );
  });

  it("keeps legacy estimator controls writable when auth permission mode is disabled", () => {
    mockPage.value = createPageModel(42, "pbx");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "parallel");

    render(<EstimatorPage />);

    expect(screen.getByTestId("detail-table").dataset.readonly).toBe("false");
    expect(screen.getByTestId("right-sidebar").dataset.readonly).toBe("false");
  });

  it("forces standard and legacy controls read-only for archived projects even when auth is disabled", () => {
    const page = createPageModel(42, "pbx");
    page.projectSelector.projects = [
      {
        id: 42,
        project_name: "Archived Project",
        status: "archived",
      },
    ];
    mockPage.value = page;
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "parallel");

    render(<EstimatorPage />);

    expect(screen.getByText("보관된 프로젝트입니다.")).toBeTruthy();
    expect(
      screen.getByText("조회만 가능하며 수정/저장은 제한됩니다.")
    ).toBeTruthy();
    expect(screen.getByTestId("standard-effort-section").dataset.readonly).toBe(
      "true"
    );
    expect(screen.getByTestId("detail-table").dataset.readonly).toBe("true");
    expect(screen.getByTestId("right-sidebar").dataset.readonly).toBe("true");
  });

  it("treats archived_at as archived for read-only mode", () => {
    const page = createPageModel(42, "pbx");
    page.projectSelector.projects = [
      {
        id: 42,
        project_name: "Archived Project",
        archived_at: "2026-06-02T00:00:00.000Z",
      },
    ];
    mockPage.value = page;
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "parallel");

    render(<EstimatorPage />);

    expect(screen.getByText("보관된 프로젝트입니다.")).toBeTruthy();
    expect(screen.getByTestId("standard-effort-section").dataset.readonly).toBe(
      "true"
    );
    expect(screen.getByTestId("detail-table").dataset.readonly).toBe("true");
  });

  it("passes readOnly=true to legacy estimator controls for dev viewers without project write permissions", async () => {
    const { AuthPermissionProvider, PERMISSIONS } = await import(
      "../src/features/auth"
    );
    mockPage.value = createPageModel(42, "pbx");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "parallel");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.ROUTE_ESTIMATOR_READ,
        }}
      >
        <EstimatorPage />
      </AuthPermissionProvider>
    );

    expect(screen.getByTestId("detail-table").dataset.readonly).toBe("true");
    expect(screen.getByTestId("right-sidebar").dataset.readonly).toBe("true");
  });

  it("passes readOnly=false to legacy estimator controls with project write permissions", async () => {
    const { AuthPermissionProvider, PERMISSIONS } = await import(
      "../src/features/auth"
    );
    mockPage.value = createPageModel(42, "pbx");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "parallel");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: [
            PERMISSIONS.ROUTE_ESTIMATOR_READ,
            PERMISSIONS.PROJECT_WRITE_OWN,
          ].join(","),
        }}
      >
        <EstimatorPage />
      </AuthPermissionProvider>
    );

    expect(screen.getByTestId("detail-table").dataset.readonly).toBe("false");
    expect(screen.getByTestId("right-sidebar").dataset.readonly).toBe("false");
  });
});
