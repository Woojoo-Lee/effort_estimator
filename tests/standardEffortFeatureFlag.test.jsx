// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
  StandardEffortSection: ({
    projectId,
    readOnly,
    solutionSelectionReadOnly,
    itemSelectionReadOnly,
    actualEffortReadOnly,
  }) => (
    <div
      data-testid="standard-effort-section"
      data-readonly={String(readOnly)}
      data-solution-readonly={String(solutionSelectionReadOnly)}
      data-item-readonly={String(itemSelectionReadOnly)}
      data-actual-readonly={String(actualEffortReadOnly)}
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
    status: { actionPermissions: {} },
    actions: { downloadExcel: vi.fn() },
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
      standardEffort: {
        lastChange: null,
        lastChangeLoading: false,
      },
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
    currentProject: null,
    isCurrentProjectArchived: false,
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

    expect(screen.getByTestId("header-bar")).toBeTruthy();
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
    expect(screen.getByTestId("summary-view")).toBeTruthy();
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("renders standard effort as the primary section without the legacy comparison area in standard mode", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");

    render(<EstimatorPage />);

    const standardSection = screen.getByTestId("standard-effort-section");

    expect(screen.queryByTestId("header-bar")).toBeNull();
    expect(screen.getByText("공수 산정")).toBeTruthy();
    expect(
      screen.queryByText("현재 화면은 엑셀 표준공수표 기준의 신규 산정 방식입니다.")
    ).toBeNull();
    expect(standardSection.textContent).toBe("42");
    expect(screen.queryByText("기존 산출 화면")).toBeNull();
    expect(screen.queryByText(/비교용/)).toBeNull();
    expect(screen.queryByText(/Contact Center Estimation Workspace/)).toBeNull();
    expect(screen.queryByText(/Internal Planning Use/)).toBeNull();
    expect(screen.queryByText(/unknown/)).toBeNull();
    expect(screen.queryByText(/짧|짤|쨌/)).toBeNull();
    expect(screen.queryByTestId("solution-tabs")).toBeNull();
    expect(screen.queryByTestId("summary-view")).toBeNull();
    expect(screen.queryByTestId("right-sidebar")).toBeNull();
  });

  it("uses the compact standard mode header with Supabase backend", () => {
    mockPage.value = createPageModel(42);
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");

    render(<EstimatorPage />);

    expect(screen.queryByTestId("header-bar")).toBeNull();
    expect(screen.getByText("공수 산정")).toBeTruthy();
    expect(
      screen.queryByText(
        "상단의 Excel 다운로드 버튼으로 표준공수 결과를 내보낼 수 있습니다."
      )
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
    expect(
      screen.getByTestId("standard-effort-section").dataset.solutionReadonly
    ).toBe("false");
    expect(
      screen.getByTestId("standard-effort-section").dataset.itemReadonly
    ).toBe("false");
  });

  it("keeps sales standard effort selections read-only for another user's project", async () => {
    const { AuthPermissionProvider, ROLES } = await import(
      "../src/features/auth"
    );
    const page = createPageModel(42);
    page.projectSelector.projects = [
      {
        id: 42,
        project_name: "Other Project",
        created_by: "other-user",
      },
    ];
    mockPage.value = page;
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT", "true");
    vi.stubEnv("VITE_STANDARD_EFFORT_MODE", "standard");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_EMAIL: "sales01@example.test",
          VITE_DEV_AUTH_ROLE_CODES: ROLES.SALES,
        }}
      >
        <EstimatorPage />
      </AuthPermissionProvider>
    );

    await screen.findByTestId("standard-effort-section");
    expect(screen.getByTestId("standard-effort-section").dataset.readonly).toBe(
      "true"
    );
    expect(
      screen.getByTestId("standard-effort-section").dataset.solutionReadonly
    ).toBe("true");
    expect(
      screen.getByTestId("standard-effort-section").dataset.itemReadonly
    ).toBe("true");
    expect(
      screen.getByTestId("standard-effort-section").dataset.actualReadonly
    ).toBe("true");
  });

  it("lets admin edit standard effort selections for ownerless projects", async () => {
    const { AuthPermissionProvider, ROLES } = await import(
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
          VITE_DEV_AUTH_ROLE_CODES: ROLES.ADMIN,
        }}
      >
        <EstimatorPage />
      </AuthPermissionProvider>
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("standard-effort-section").dataset.readonly
      ).toBe("false")
    );
    expect(
      screen.getByTestId("standard-effort-section").dataset.solutionReadonly
    ).toBe("false");
    expect(
      screen.getByTestId("standard-effort-section").dataset.itemReadonly
    ).toBe("false");
    expect(
      screen.getByTestId("standard-effort-section").dataset.actualReadonly
    ).toBe("false");
  });

  it("keeps viewer standard effort actions read-only", async () => {
    const { AuthPermissionProvider, ROLES } = await import(
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
          VITE_DEV_AUTH_ROLE_CODES: ROLES.VIEWER,
        }}
      >
        <EstimatorPage />
      </AuthPermissionProvider>
    );

    await screen.findByTestId("standard-effort-section");
    expect(screen.getByTestId("standard-effort-section").dataset.readonly).toBe(
      "true"
    );
    expect(
      screen.getByTestId("standard-effort-section").dataset.solutionReadonly
    ).toBe("true");
    expect(
      screen.getByTestId("standard-effort-section").dataset.itemReadonly
    ).toBe("true");
    expect(
      screen.getByTestId("standard-effort-section").dataset.actualReadonly
    ).toBe("true");
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
