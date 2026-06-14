// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProjectList from "../src/features/projects/components/ProjectList";
import ProjectSelectorBar from "../src/features/projects/components/ProjectSelectorBar";
import ProjectPage from "../src/features/projects/pages/ProjectPage";
import { AuthPermissionProvider, PERMISSIONS, ROLES } from "../src/features/auth";

const storeMock = vi.hoisted(() => ({
  state: null,
}));

const projectServiceMocks = vi.hoisted(() => ({
  fetchProjects: vi.fn(),
  restoreProjectById: vi.fn(),
}));

vi.mock("../src/store/useEstimatorStore", () => ({
  useEstimatorStore: (selector) => selector(storeMock.state),
}));

vi.mock("../src/services/projectService", () => ({
  fetchProjects: projectServiceMocks.fetchProjects,
  restoreProjectById: projectServiceMocks.restoreProjectById,
}));

function createStoreState(overrides = {}) {
  return {
    projects: [
      {
        id: 1,
        project_name: "Active Project",
        updated_at: "2026-06-01T00:00:00.000Z",
        status: "active",
      },
    ],
    projectId: null,
    projectName: "",
    savedAt: "",
    draftProjectName: "",
    isProjectsBusy: false,
    isProjectActionBusy: false,
    lastProjectsError: "",
    refreshProjects: vi.fn(),
    createProjectFromDraft: vi.fn(),
    selectProject: vi.fn(),
    deleteProject: vi.fn(),
    setDraftProjectName: vi.fn(),
    ...overrides,
  };
}

function createArchivedProject(overrides = {}) {
  return {
    id: 2,
    project_name: "Archived Project",
    updated_at: "2026-05-01T00:00:00.000Z",
    archived_at: "2026-06-02T00:00:00.000Z",
    status: "archived",
    ...overrides,
  };
}

function renderProjectPageWithAuth(env) {
  if (!env) {
    return render(<ProjectPage />);
  }

  return render(
    <AuthPermissionProvider env={env}>
      <ProjectPage />
    </AuthPermissionProvider>
  );
}

describe("project archive UI", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    storeMock.state = createStoreState();
    projectServiceMocks.fetchProjects.mockReset();
    projectServiceMocks.restoreProjectById.mockReset();
    projectServiceMocks.fetchProjects.mockResolvedValue({
      data: [],
      error: null,
    });
    projectServiceMocks.restoreProjectById.mockResolvedValue({
      data: { id: 2, status: "active" },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("shows archived projects through a local API-mode archive view", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth();

    fireEvent.click(
      screen.getByRole("button", { name: "보관 프로젝트 보기" })
    );

    await waitFor(() =>
      expect(projectServiceMocks.fetchProjects).toHaveBeenCalledWith({
        status: "archived",
      })
    );

    expect(screen.getByText("Archived Project")).toBeTruthy();
    expect(screen.getByText("보관됨")).toBeTruthy();
    expect(screen.getByText(/보관일/)).toBeTruthy();

    const archivedRow = screen.getByText("Archived Project").closest("tr");
    expect(
      within(archivedRow).getByRole("button", { name: "선택" }).disabled
    ).toBe(true);
    expect(
      within(archivedRow).getByRole("button", { name: "복원" }).disabled
    ).toBe(false);
    expect(
      within(archivedRow).queryByRole("button", { name: "보관" })
    ).toBeNull();
  });

  it("enables archive restore in dev mode when project.write.all exists", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth({
      VITE_AUTH_PERMISSION_MODE: "dev",
      VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.PROJECT_WRITE_ALL,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "보관 프로젝트 보기" })
    );

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    await waitFor(() =>
      expect(
        within(archivedRow).getByRole("button", { name: "복원" }).disabled
      ).toBe(false)
    );
  });

  it("disables archive restore in dev mode without project.write.all", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth({
      VITE_AUTH_PERMISSION_MODE: "dev",
      VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.PROJECT_WRITE_OWN,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "보관 프로젝트 보기" })
    );

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));
    const restoreButton = within(archivedRow).getByRole("button", {
      name: "복원",
    });

    expect(restoreButton.disabled).toBe(true);
    expect(restoreButton.title).toBe("프로젝트 복원 권한이 없습니다.");
    expect(screen.getByText("프로젝트 복원 권한이 없습니다.")).toBeTruthy();

    fireEvent.click(restoreButton);

    expect(projectServiceMocks.restoreProjectById).not.toHaveBeenCalled();
    expect(screen.queryByText("이 프로젝트를 복원할까요?")).toBeNull();
  });

  it("does not allow restore from the system_admin role alone", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth({
      VITE_AUTH_PERMISSION_MODE: "dev",
      VITE_DEV_AUTH_ROLE_CODES: ROLES.SYSTEM_ADMIN,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "보관 프로젝트 보기" })
    );

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    expect(
      within(archivedRow).getByRole("button", { name: "복원" }).disabled
    ).toBe(true);
  });

  it("allows sales project creation but disables archive/delete actions", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      draftProjectName: "Sales Project",
    });

    renderProjectPageWithAuth({
      VITE_AUTH_PERMISSION_MODE: "dev",
      VITE_DEV_AUTH_ROLE_CODES: ROLES.SALES,
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "프로젝트 생성" }).disabled
      ).toBe(false)
    );

    const activeRow = screen.getByText("Active Project").closest("tr");
    expect(
      within(activeRow).getByRole("button", { name: "보관" }).disabled
    ).toBe(true);
  });

  it("keeps viewer project creation and archive/delete actions disabled", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      draftProjectName: "Viewer Project",
    });

    renderProjectPageWithAuth({
      VITE_AUTH_PERMISSION_MODE: "dev",
      VITE_DEV_AUTH_ROLE_CODES: ROLES.VIEWER,
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "프로젝트 생성" }).disabled
      ).toBe(true)
    );

    const activeRow = screen.getByText("Active Project").closest("tr");
    expect(
      within(activeRow).getByRole("button", { name: "보관" }).disabled
    ).toBe(true);
  });

  it("restores an archived project and refreshes archived and active lists", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    const refreshProjects = vi.fn();
    const selectProject = vi.fn();
    storeMock.state = createStoreState({ refreshProjects, selectProject });
    projectServiceMocks.fetchProjects
      .mockResolvedValueOnce({
        data: [
          createArchivedProject({ id: "00000042" }),
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });

    render(<ProjectPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "보관 프로젝트 보기" })
    );

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    fireEvent.click(within(archivedRow).getByRole("button", { name: "복원" }));
    expect(screen.getByText("이 프로젝트를 복원할까요?")).toBeTruthy();

    fireEvent.click(
      within(archivedRow).getByRole("button", { name: "복원" })
    );

    await waitFor(() =>
      expect(projectServiceMocks.restoreProjectById).toHaveBeenCalledWith(
        "00000042"
      )
    );
    await waitFor(() =>
      expect(projectServiceMocks.fetchProjects).toHaveBeenCalledTimes(2)
    );
    await waitFor(() => expect(refreshProjects).toHaveBeenCalledTimes(2));

    expect(screen.getByText("프로젝트가 복원되었습니다.")).toBeTruthy();
    expect(selectProject).not.toHaveBeenCalled();
  });

  it("keeps the archived row visible and shows an error when restore fails", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createArchivedProject()],
      error: null,
    });
    projectServiceMocks.restoreProjectById.mockResolvedValueOnce({
      data: null,
      error: new Error("restore failed"),
    });

    render(<ProjectPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "보관 프로젝트 보기" })
    );

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    fireEvent.click(within(archivedRow).getByRole("button", { name: "복원" }));
    fireEvent.click(
      within(archivedRow).getByRole("button", { name: "복원" })
    );

    await waitFor(() =>
      expect(screen.getByText("프로젝트 복원에 실패했습니다.")).toBeTruthy()
    );

    expect(screen.getByText("Archived Project")).toBeTruthy();
    expect(projectServiceMocks.fetchProjects).toHaveBeenCalledTimes(1);
  });

  it("marks the restore action busy while the restore request is pending", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    let resolveRestore;
    projectServiceMocks.fetchProjects
      .mockResolvedValueOnce({
        data: [
          createArchivedProject(),
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });
    projectServiceMocks.restoreProjectById.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRestore = resolve;
      })
    );

    render(<ProjectPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "보관 프로젝트 보기" })
    );

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    fireEvent.click(within(archivedRow).getByRole("button", { name: "복원" }));
    fireEvent.click(
      within(archivedRow).getByRole("button", { name: "복원" })
    );

    await waitFor(() =>
      expect(
        within(archivedRow).getByRole("button", { name: "복원 중..." })
          .disabled
      ).toBe(true)
    );

    resolveRestore({ data: { id: 2, status: "active" }, error: null });

    await waitFor(() =>
      expect(screen.getByText("프로젝트가 복원되었습니다.")).toBeTruthy()
    );
  });

  it("does not expose the archive view control in Supabase mode", () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");

    render(<ProjectPage />);

    expect(screen.queryByRole("button", { name: "보관 프로젝트 보기" })).toBeNull();
    expect(projectServiceMocks.fetchProjects).not.toHaveBeenCalled();
  });

  it("uses archive wording for the active list action in API mode", () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    storeMock.state = createStoreState({
      deleteProject: vi.fn(() => Promise.resolve(true)),
    });

    render(<ProjectPage />);

    const activeRow = screen.getByText("Active Project").closest("tr");
    fireEvent.click(within(activeRow).getByRole("button", { name: "보관" }));

    expect(
      within(activeRow).getByRole("button", { name: "보관 처리" })
    ).toBeTruthy();
    expect(within(activeRow).getByRole("button", { name: "취소" })).toBeTruthy();
    expect(within(activeRow).queryByRole("button", { name: "복원" })).toBeNull();
  });

  it("keeps archive rows non-restorable in ProjectList", () => {
    render(
      <ProjectList
        projects={[
          {
            id: 2,
            project_name: "Archived Project",
            archived_at: "2026-06-02T00:00:00.000Z",
            status: "archived",
          },
        ]}
        currentProjectId={null}
        selectProject={vi.fn()}
        deleteProject={vi.fn()}
        refreshProjects={vi.fn()}
        disableSelectArchived
        hideDeleteForArchived
      />
    );

    expect(screen.getByText("보관됨")).toBeTruthy();
    expect(screen.getByRole("button", { name: "선택" }).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "복원" })).toBeNull();
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });

  it("does not call the restore handler when ProjectList restore is permission-disabled", () => {
    const restoreProject = vi.fn();

    render(
      <ProjectList
        projects={[createArchivedProject()]}
        currentProjectId={null}
        selectProject={vi.fn()}
        deleteProject={vi.fn()}
        refreshProjects={vi.fn()}
        disableSelectArchived
        hideDeleteForArchived
        restoreProject={restoreProject}
        canRestoreArchivedProject={false}
        restoreDisabledReason="프로젝트 복원 권한이 없습니다."
      />
    );

    const restoreButton = screen.getByRole("button", { name: "복원" });

    expect(restoreButton.disabled).toBe(true);
    expect(restoreButton.title).toBe("프로젝트 복원 권한이 없습니다.");
    expect(screen.getByText("프로젝트 복원 권한이 없습니다.")).toBeTruthy();

    fireEvent.click(restoreButton);

    expect(restoreProject).not.toHaveBeenCalled();
    expect(screen.queryByText("이 프로젝트를 복원할까요?")).toBeNull();
  });

  it("filters archived projects out of the project selector options", () => {
    render(
      <ProjectSelectorBar
        projects={[
          { id: 1, project_name: "Active Project", status: "active" },
          {
            id: 2,
            project_name: "Archived Project",
            archived_at: "2026-06-02T00:00:00.000Z",
            status: "archived",
          },
        ]}
        projectId={null}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady
        isBusy={false}
      />
    );

    const options = screen.getAllByRole("option").map((option) => option.textContent);

    expect(options.join(" ")).toContain("Active Project");
    expect(options.join(" ")).not.toContain("Archived Project");
    expect(screen.getByText("전체 1건")).toBeTruthy();
  });

  it("keeps the current archived project label visible while excluding it from options", () => {
    render(
      <ProjectSelectorBar
        projects={[
          { id: 1, project_name: "Active Project", status: "active" },
          {
            id: 2,
            project_name: "Archived Project",
            archived_at: "2026-06-02T00:00:00.000Z",
            status: "archived",
          },
        ]}
        projectId={2}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady
        isBusy={false}
      />
    );

    expect(screen.getByText(/Archived Project/)).toBeTruthy();

    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options.join(" ")).not.toContain("Archived Project");
  });
});
