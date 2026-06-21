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
import ProjectPage, {
  getProjectOwnerUserId,
} from "../src/features/projects/pages/ProjectPage";
import {
  AuthPermissionProvider,
  AuthSessionProvider,
  ROLES,
} from "../src/features/auth";

const TEXT = {
  archive: "\uBCF4\uAD00",
  archiveConfirm: "\uBCF4\uAD00 \uCC98\uB9AC",
  archiveView: "\uBCF4\uAD00 \uD504\uB85C\uC81D\uD2B8 \uBCF4\uAE30",
  activeView: "\uD65C\uC131 \uD504\uB85C\uC81D\uD2B8 \uBCF4\uAE30",
  cancel: "\uCDE8\uC18C",
  create: "\uD504\uB85C\uC81D\uD2B8 \uC0DD\uC131",
  restore: "\uBCF5\uC6D0",
  restorePending: "\uBCF5\uC6D0 \uC911...",
  restoreQuestion:
    "\uC774 \uD504\uB85C\uC81D\uD2B8\uB97C \uBCF5\uC6D0\uD560\uAE4C\uC694?",
  restoreSuccess:
    "\uD504\uB85C\uC81D\uD2B8\uAC00 \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  restoreFailure:
    "\uD504\uB85C\uC81D\uD2B8 \uBCF5\uC6D0\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  select: "\uC120\uD0DD",
  selectedCount: "\uC804\uCCB4 1\uAC74",
  missingArchiveOwner:
    "\uB4F1\uB85D\uC790 \uC815\uBCF4\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC5B4 \uBCF4\uAD00\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  missingRestoreOwner:
    "\uB4F1\uB85D\uC790 \uC815\uBCF4\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC5B4 \uBCF5\uC6D0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  otherArchiveOwner:
    "\uB4F1\uB85D\uC790 \uBCF8\uC778\uB9CC \uBCF4\uAD00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
};

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

function createOwnedArchivedProject(overrides = {}) {
  return createArchivedProject({
    created_by: "dev-auth-user",
    ...overrides,
  });
}

function createOwnedActiveProject(overrides = {}) {
  return {
    id: 1,
    project_name: "Active Project",
    updated_at: "2026-06-01T00:00:00.000Z",
    status: "active",
    created_by: "dev-auth-user",
    ...overrides,
  };
}

function createSalesOwnedActiveProject(overrides = {}) {
  return createOwnedActiveProject({
    created_by: "sales-user",
    ...overrides,
  });
}

function createSalesOwnedArchivedProject(overrides = {}) {
  return createArchivedProject({
    created_by: "sales-user",
    ...overrides,
  });
}

function createSessionUser(roleCode = ROLES.ADMIN, overrides = {}) {
  return {
    user_id: "dev-auth-user",
    login_id: `${roleCode}01`,
    display_name: "Dev Owner",
    role_code: roleCode,
    role_codes: [roleCode],
    ...overrides,
  };
}

function createAuthSessionRepository(user = createSessionUser()) {
  return {
    getAuthSession: vi.fn().mockResolvedValue({
      data: {
        session: { user },
      },
      error: null,
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    changePassword: vi.fn(),
    onAuthStateChange: vi.fn(() => ({})),
  };
}

function createDevAuthEnv(overrides = {}) {
  return {
    VITE_AUTH_PERMISSION_MODE: "dev",
    ...overrides,
  };
}

function renderProjectPageWithAuth(env, user = createSessionUser()) {
  if (!env) {
    return render(<ProjectPage />);
  }

  return render(
    <AuthSessionProvider
      env={{ VITE_AUTH_LOGIN_MODE: "app" }}
      repository={createAuthSessionRepository(user)}
    >
      <AuthPermissionProvider env={env}>
        <ProjectPage />
      </AuthPermissionProvider>
    </AuthSessionProvider>
  );
}

function getProjectRow(projectName) {
  const projectButton = screen
    .getAllByRole("button", { name: projectName })
    .find((button) => button.closest("tr"));

  if (projectButton) {
    return projectButton.closest("tr");
  }

  return screen.getByText(projectName).closest("tr");
}

function getRowButton(row, name) {
  return within(row).getByRole("button", { name });
}

function openArchivedView() {
  fireEvent.click(screen.getByRole("button", { name: TEXT.archiveView }));
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

  it("resolves project owner metadata from top-level and payload fields", () => {
    expect(getProjectOwnerUserId({ owner_user_id: "user-a" })).toBe("user-a");
    expect(getProjectOwnerUserId({ created_by: "user-b" })).toBe("user-b");
    expect(getProjectOwnerUserId({ createdByUserId: "user-c" })).toBe(
      "user-c"
    );
    expect(
      getProjectOwnerUserId({
        payload: {
          owner_user_id: "user-d",
        },
      })
    ).toBe("user-d");
    expect(
      getProjectOwnerUserId({
        payload: {
          createdBy: "user-e",
        },
      })
    ).toBe("user-e");
    expect(getProjectOwnerUserId({ payload: {} })).toBeNull();
  });

  it("passes the current session user to project creation", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    const createProjectFromDraft = vi.fn();
    storeMock.state = createStoreState({
      draftProjectName: "Owner Project",
      createProjectFromDraft,
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    const createButton = await screen.findByRole("button", {
      name: TEXT.create,
    });
    const form = createButton.closest("form");

    await waitFor(() => expect(createButton.disabled).toBe(false));
    form.dispatchEvent(
      new Event("submit", {
        bubbles: true,
        cancelable: true,
      })
    );

    await waitFor(() =>
      expect(createProjectFromDraft).toHaveBeenCalledWith({
        currentUser: expect.objectContaining({
          user_id: "dev-auth-user",
        }),
      })
    );
  });

  it("passes the sales session user to project creation", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    const createProjectFromDraft = vi.fn();
    storeMock.state = createStoreState({
      draftProjectName: "Sales Owner Project",
      createProjectFromDraft,
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.SALES, {
        user_id: "sales-user",
        login_id: "sales01",
      })
    );

    const createButton = await screen.findByRole("button", {
      name: TEXT.create,
    });
    const form = createButton.closest("form");

    await waitFor(() => expect(createButton.disabled).toBe(false));
    form.dispatchEvent(
      new Event("submit", {
        bubbles: true,
        cancelable: true,
      })
    );

    await waitFor(() =>
      expect(createProjectFromDraft).toHaveBeenCalledWith({
        currentUser: expect.objectContaining({
          user_id: "sales-user",
        }),
      })
    );
  });

  it("shows archived projects but disables restore when owner metadata is missing", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth();

    openArchivedView();

    await waitFor(() =>
      expect(projectServiceMocks.fetchProjects).toHaveBeenCalledWith({
        status: "archived",
      })
    );

    const archivedRow = getProjectRow("Archived Project");
    expect(getRowButton(archivedRow, TEXT.select).disabled).toBe(true);
    expect(getRowButton(archivedRow, TEXT.restore).disabled).toBe(true);
    expect(getRowButton(archivedRow, TEXT.restore).title).toBe(
      TEXT.missingRestoreOwner
    );
    expect(
      within(archivedRow).queryByRole("button", { name: TEXT.archive })
    ).toBeNull();
  });

  it("enables archive for an active project owned through payload metadata", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projects: [
        createOwnedActiveProject({
          created_by: undefined,
          payload: {
            owner_user_id: "dev-auth-user",
          },
        }),
      ],
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    const activeRow = getProjectRow("Active Project");
    await waitFor(() =>
      expect(getRowButton(activeRow, TEXT.archive).disabled).toBe(false)
    );
  });

  it("enables archive for admin even when active project owner metadata is missing", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState();

    renderProjectPageWithAuth(createDevAuthEnv());

    const activeRow = getProjectRow("Active Project");
    const archiveButton = getRowButton(activeRow, TEXT.archive);

    await waitFor(() => expect(archiveButton.disabled).toBe(false));
  });

  it("enables archive for admin when active project belongs to another owner", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projects: [
        createOwnedActiveProject({
          created_by: "other-user",
        }),
      ],
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    const activeRow = getProjectRow("Active Project");
    const archiveButton = getRowButton(activeRow, TEXT.archive);

    await waitFor(() => expect(archiveButton.disabled).toBe(false));
  });

  it("enables archive restore for the owner with project.write.all", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createOwnedArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    openArchivedView();

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    await waitFor(() =>
      expect(getRowButton(archivedRow, TEXT.restore).disabled).toBe(false)
    );
  });

  it("enables archive restore for admin when archived project owner metadata is missing", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    openArchivedView();

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    await waitFor(() =>
      expect(getRowButton(archivedRow, TEXT.restore).disabled).toBe(false)
    );
  });

  it("enables archive restore for a sales-owned project with project.write.own", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createSalesOwnedArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.SALES, {
        user_id: "sales-user",
        login_id: "sales01",
      })
    );

    openArchivedView();

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));
    const restoreButton = getRowButton(archivedRow, TEXT.restore);

    expect(restoreButton.disabled).toBe(false);
    fireEvent.click(restoreButton);

    expect(screen.getByText(TEXT.restoreQuestion)).toBeTruthy();
    expect(projectServiceMocks.restoreProjectById).not.toHaveBeenCalled();
  });

  it("does not allow restore from the system_admin role alone", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createOwnedArchivedProject()],
      error: null,
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.SYSTEM_ADMIN)
    );

    openArchivedView();

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    expect(getRowButton(archivedRow, TEXT.restore).disabled).toBe(true);
  });

  it("allows sales project creation but keeps archive disabled when owner metadata is missing", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      draftProjectName: "Sales Project",
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.SALES)
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: TEXT.create }).disabled).toBe(
        false
      )
    );

    const activeRow = getProjectRow("Active Project");
    expect(getRowButton(activeRow, TEXT.archive).disabled).toBe(true);
  });

  it("enables archive for a sales-owned active project", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projects: [createSalesOwnedActiveProject()],
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.SALES, {
        user_id: "sales-user",
        login_id: "sales01",
      })
    );

    const activeRow = getProjectRow("Active Project");

    await waitFor(() =>
      expect(getRowButton(activeRow, TEXT.archive).disabled).toBe(false)
    );
  });

  it("keeps archive disabled for a project owned by another sales user", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projects: [createOwnedActiveProject({ created_by: "other-sales" })],
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.SALES, {
        user_id: "sales-user",
        login_id: "sales01",
      })
    );

    const activeRow = getProjectRow("Active Project");
    const archiveButton = getRowButton(activeRow, TEXT.archive);

    await waitFor(() => {
      expect(archiveButton.disabled).toBe(true);
      expect(archiveButton.title).toBe(TEXT.otherArchiveOwner);
    });
  });

  it("keeps archive enabled for the currently selected sales-owned project", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projectId: 1,
      projectName: "Active Project",
      projects: [createSalesOwnedActiveProject()],
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.SALES, {
        user_id: "sales-user",
        login_id: "sales01",
      })
    );

    const activeRow = getProjectRow("Active Project");

    expect(within(activeRow).getByText(/\uD604\uC7AC \uC120\uD0DD\uB428/)).toBeTruthy();
    await waitFor(() =>
      expect(getRowButton(activeRow, TEXT.archive).disabled).toBe(false)
    );
  });

  it("keeps viewer project creation and archive actions disabled", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      draftProjectName: "Viewer Project",
      projects: [createOwnedActiveProject()],
    });

    renderProjectPageWithAuth(
      createDevAuthEnv(),
      createSessionUser(ROLES.VIEWER)
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: TEXT.create }).disabled).toBe(
        true
      )
    );

    const activeRow = getProjectRow("Active Project");
    expect(getRowButton(activeRow, TEXT.archive).disabled).toBe(true);
  });

  it("restores an archived project and refreshes archived and active lists", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    const refreshProjects = vi.fn();
    const selectProject = vi.fn();
    storeMock.state = createStoreState({ refreshProjects, selectProject });
    projectServiceMocks.fetchProjects
      .mockResolvedValueOnce({
        data: [createOwnedArchivedProject({ id: "00000042" })],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });

    renderProjectPageWithAuth(createDevAuthEnv());

    openArchivedView();

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    fireEvent.click(getRowButton(archivedRow, TEXT.restore));
    expect(screen.getByText(TEXT.restoreQuestion)).toBeTruthy();

    fireEvent.click(getRowButton(archivedRow, TEXT.restore));

    await waitFor(() =>
      expect(projectServiceMocks.restoreProjectById).toHaveBeenCalledWith(
        "00000042",
        {
          currentUser: expect.objectContaining({
            user_id: "dev-auth-user",
          }),
        }
      )
    );
    await waitFor(() =>
      expect(projectServiceMocks.fetchProjects).toHaveBeenCalledTimes(2)
    );
    await waitFor(() => expect(refreshProjects).toHaveBeenCalledTimes(2));

    expect(screen.getByText(TEXT.restoreSuccess)).toBeTruthy();
    expect(selectProject).not.toHaveBeenCalled();
  });

  it("keeps the archived row visible and shows an error when restore fails", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    projectServiceMocks.fetchProjects.mockResolvedValueOnce({
      data: [createOwnedArchivedProject()],
      error: null,
    });
    projectServiceMocks.restoreProjectById.mockResolvedValueOnce({
      data: null,
      error: new Error("restore failed"),
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    openArchivedView();

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    fireEvent.click(getRowButton(archivedRow, TEXT.restore));
    fireEvent.click(getRowButton(archivedRow, TEXT.restore));

    await waitFor(() =>
      expect(screen.getByText(TEXT.restoreFailure)).toBeTruthy()
    );

    expect(screen.getByText("Archived Project")).toBeTruthy();
    expect(projectServiceMocks.fetchProjects).toHaveBeenCalledTimes(1);
  });

  it("marks the restore action busy while the restore request is pending", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    let resolveRestore;
    projectServiceMocks.fetchProjects
      .mockResolvedValueOnce({
        data: [createOwnedArchivedProject()],
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

    renderProjectPageWithAuth(createDevAuthEnv());

    openArchivedView();

    const archivedRow = await screen
      .findByText("Archived Project")
      .then((node) => node.closest("tr"));

    fireEvent.click(getRowButton(archivedRow, TEXT.restore));
    fireEvent.click(getRowButton(archivedRow, TEXT.restore));

    await waitFor(() =>
      expect(getRowButton(archivedRow, TEXT.restorePending).disabled).toBe(true)
    );

    resolveRestore({ data: { id: 2, status: "active" }, error: null });

    await waitFor(() =>
      expect(screen.getByText(TEXT.restoreSuccess)).toBeTruthy()
    );
  });

  it("exposes soft archive controls in Supabase mode without hard delete wording", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projects: [createOwnedActiveProject()],
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    expect(screen.getByText(/\uD504\uB85C\uC81D\uD2B8 \uAD00\uB9AC/)).toBeTruthy();
    expect(screen.getByRole("button", { name: TEXT.archiveView })).toBeTruthy();
    expect(screen.queryByText(/\uC0AD\uC81C/)).toBeNull();
    await waitFor(() =>
      expect(getRowButton(getProjectRow("Active Project"), TEXT.archive).disabled).toBe(
        false
      )
    );
    expect(projectServiceMocks.fetchProjects).not.toHaveBeenCalled();
  });

  it("keeps archive enabled for the currently selected owner project", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projectId: 1,
      projectName: "Active Project",
      projects: [createOwnedActiveProject()],
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    const activeRow = getProjectRow("Active Project");

    expect(within(activeRow).getByText(/\uD604\uC7AC \uC120\uD0DD\uB428/)).toBeTruthy();
    await waitFor(() =>
      expect(getRowButton(activeRow, TEXT.archive).disabled).toBe(false)
    );
  });

  it("uses archive wording for an owner project in API mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    storeMock.state = createStoreState({
      projects: [createOwnedActiveProject()],
      deleteProject: vi.fn(() => Promise.resolve(true)),
    });

    renderProjectPageWithAuth(createDevAuthEnv());

    const activeRow = getProjectRow("Active Project");
    await waitFor(() =>
      expect(getRowButton(activeRow, TEXT.archive).disabled).toBe(false)
    );
    fireEvent.click(getRowButton(activeRow, TEXT.archive));

    expect(getRowButton(activeRow, TEXT.archiveConfirm)).toBeTruthy();
    expect(getRowButton(activeRow, TEXT.cancel)).toBeTruthy();
    fireEvent.click(getRowButton(activeRow, TEXT.archiveConfirm));

    await waitFor(() =>
      expect(storeMock.state.deleteProject).toHaveBeenCalledWith(1, {
        currentUser: expect.objectContaining({
          user_id: "dev-auth-user",
        }),
      })
    );
    expect(
      within(activeRow).queryByRole("button", { name: TEXT.restore })
    ).toBeNull();
  });

  it("keeps archive rows non-restorable in ProjectList", () => {
    render(
      <ProjectList
        projects={[createArchivedProject()]}
        currentProjectId={null}
        selectProject={vi.fn()}
        deleteProject={vi.fn()}
        refreshProjects={vi.fn()}
        disableSelectArchived
        hideDeleteForArchived
      />
    );

    expect(screen.getByText(/\uBCF4\uAD00\uB428/)).toBeTruthy();
    expect(screen.getByRole("button", { name: TEXT.select }).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: TEXT.restore })).toBeNull();
    expect(screen.queryByRole("button", { name: /\uC0AD\uC81C/ })).toBeNull();
  });

  it("shows the project updater from display name, login id, or fallback", () => {
    render(
      <ProjectList
        projects={[
          {
            id: 1,
            project_name: "Display Updater",
            updated_at: "2026-06-01T00:00:00.000Z",
            payload: {
              updated_by_display_name: "관리자",
              updated_by_login_id: "admin01",
            },
          },
          {
            id: 2,
            project_name: "Login Updater",
            updated_at: "2026-06-01T00:00:00.000Z",
            payload: {
              updated_by_login_id: "sales01",
            },
          },
          {
            id: 3,
            project_name: "Unknown Updater",
            updated_at: "2026-06-01T00:00:00.000Z",
          },
        ]}
        currentProjectId={null}
        selectProject={vi.fn()}
        deleteProject={vi.fn()}
        refreshProjects={vi.fn()}
        canDeleteProject={false}
      />
    );

    expect(screen.getByText("수정자")).toBeTruthy();
    expect(screen.getByText("관리자")).toBeTruthy();
    expect(screen.getByText("sales01")).toBeTruthy();
    expect(getProjectRow("Unknown Updater").textContent).toContain("-");
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
        restoreDisabledReason="restore disabled"
      />
    );

    const restoreButton = screen.getByRole("button", { name: TEXT.restore });

    expect(restoreButton.disabled).toBe(true);
    expect(restoreButton.title).toBe("restore disabled");

    fireEvent.click(restoreButton);

    expect(restoreProject).not.toHaveBeenCalled();
    expect(screen.queryByText(TEXT.restoreQuestion)).toBeNull();
  });

  it("filters archived projects out of the project selector options", () => {
    render(
      <ProjectSelectorBar
        projects={[
          { id: 1, project_name: "Active Project", status: "active" },
          createArchivedProject(),
        ]}
        projectId={null}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady
        isBusy={false}
      />
    );

    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(options.join(" ")).toContain("Active Project");
    expect(options.join(" ")).not.toContain("Archived Project");
    expect(screen.getByText(TEXT.selectedCount)).toBeTruthy();
  });

  it("keeps the current archived project label visible while excluding it from options", () => {
    render(
      <ProjectSelectorBar
        projects={[
          { id: 1, project_name: "Active Project", status: "active" },
          createArchivedProject(),
        ]}
        projectId={2}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady
        isBusy={false}
      />
    );

    expect(screen.getByText(/Archived Project/)).toBeTruthy();

    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options.join(" ")).not.toContain("Archived Project");
  });
});
