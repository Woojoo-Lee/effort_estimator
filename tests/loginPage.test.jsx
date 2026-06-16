// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/estimator/pages/EstimatorPage", () => ({
  default: () => <div>Estimator Screen</div>,
}));
vi.mock("../src/features/codebooks/pages/CodebookPage", () => ({
  default: () => <div>Codebook Screen</div>,
}));
vi.mock("../src/features/itemMeta/pages/ItemMetaPage", () => ({
  default: () => <div>Item Meta Screen</div>,
}));
vi.mock("../src/features/projects/pages/ProjectPage", () => ({
  default: () => <div>Project Screen</div>,
}));
vi.mock("../src/features/standardEffortMeta/pages/StandardEffortMetaPage", () => ({
  default: () => <div>Standard Effort Meta Screen</div>,
}));

import AppRouter from "../src/app/AppRouter";
import {
  AuthPermissionProvider,
  AuthSessionProvider,
  useAuthSession,
} from "../src/features/auth";
import LoginPage from "../src/features/auth/pages/LoginPage";
import MainLayout from "../src/features/layout/components/MainLayout";

function createSession(loginId = "admin01", roleCode = "admin") {
  return {
    user: {
      user_id: "app-user-1",
      login_id: loginId,
      display_name: "Admin User",
      role_code: roleCode,
      role_codes: [roleCode],
    },
  };
}

function createRepository({ session = null } = {}) {
  return {
    getAuthSession: vi.fn().mockResolvedValue({
      data: {
        session,
      },
      error: null,
    }),
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ data: null, error: null }),
    changePassword: vi.fn().mockResolvedValue({
      data: { reauth_required: true },
      error: null,
    }),
    onAuthStateChange: vi.fn(() => ({})),
  };
}

function renderWithProviders({
  route = "/login",
  authEnv = { VITE_AUTH_LOGIN_MODE: "app" },
  permissionEnv = { VITE_AUTH_PERMISSION_MODE: "disabled" },
  repository = createRepository(),
  children = null,
} = {}) {
  return {
    repository,
    ...render(
      <AuthSessionProvider env={authEnv} repository={repository}>
        <AuthPermissionProvider env={permissionEnv}>
          {children || <AppRouter route={route} />}
        </AuthPermissionProvider>
      </AuthSessionProvider>
    ),
  };
}

function TestAuthenticatedShell({ route = "/estimator" }) {
  const authSession = useAuthSession();

  if (authSession.loading) {
    return <div>Loading session</div>;
  }

  if (authSession.requireLogin && !authSession.isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <MainLayout activeRoute={route}>
      <AppRouter route={route} />
    </MainLayout>
  );
}

function renderAppShell({
  route = "/estimator",
  authEnv = { VITE_AUTH_LOGIN_MODE: "app" },
  permissionEnv = { VITE_AUTH_PERMISSION_MODE: "disabled" },
  repository = createRepository({
    session: createSession("admin01", "admin"),
  }),
} = {}) {
  return {
    repository,
    ...render(
      <AuthSessionProvider env={authEnv} repository={repository}>
        <AuthPermissionProvider env={permissionEnv}>
          <TestAuthenticatedShell route={route} />
        </AuthPermissionProvider>
      </AuthSessionProvider>
    ),
  };
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    window.location.hash = "";
  });

  it("renders user ID and password inputs without email wording", () => {
    renderWithProviders({ children: <LoginPage /> });

    expect(screen.getByLabelText("사용자 ID")).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(screen.queryByText(/email/i)).toBeNull();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByLabelText("Password").type).toBe("password");
    expect(screen.queryByTestId("global-auth-user")).toBeNull();
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "비밀번호 변경" })
    ).toBeNull();
    expect(document.querySelector("aside")).toBeNull();
  });

  it("submits app login credentials and navigates to the default route", async () => {
    const repository = createRepository();
    repository.signIn.mockResolvedValue({
      data: {
        session: createSession("sales01", "sales"),
      },
      error: null,
    });

    renderWithProviders({ repository, children: <LoginPage /> });

    const loginButton = await screen.findByRole("button", { name: "로그인" });

    fireEvent.change(screen.getByLabelText("사용자 ID"), {
      target: { value: "sales01" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(loginButton);

    await waitFor(() =>
      expect(repository.signIn).toHaveBeenCalledWith({
        loginId: "sales01",
        password: "secret",
      })
    );
    await waitFor(() => expect(window.location.hash).toBe("#/estimator"));
  });

  it("shows an app login error message on sign-in failure", async () => {
    const repository = createRepository();
    repository.signIn.mockRejectedValue(
      new Error("사용자 ID 또는 비밀번호를 확인하세요.")
    );

    renderWithProviders({ repository, children: <LoginPage /> });

    const loginButton = await screen.findByRole("button", { name: "로그인" });

    fireEvent.change(screen.getByLabelText("사용자 ID"), {
      target: { value: "viewer01" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(loginButton);

    expect(
      await screen.findByText("사용자 ID 또는 비밀번호를 확인하세요.")
    ).toBeTruthy();
  });

  it("keeps the existing estimator route available when login mode is disabled", () => {
    renderWithProviders({
      route: "/estimator",
      authEnv: { VITE_AUTH_LOGIN_MODE: "disabled" },
    });

    expect(screen.getByText("Estimator Screen")).toBeTruthy();
  });

  it("shows full-screen login for protected app routes when session is missing", async () => {
    renderWithProviders({
      route: "/estimator",
      repository: createRepository({ session: null }),
    });

    expect(await screen.findByText("Effort Estimator 로그인")).toBeTruthy();
    expect(document.querySelector("aside")).toBeNull();
  });

  it("shows the requested app route when an app session exists", async () => {
    renderWithProviders({
      route: "/estimator",
      repository: createRepository({
        session: createSession("admin01", "admin"),
      }),
    });

    expect(await screen.findByText("Estimator Screen")).toBeTruthy();
  });

  it("shows the current app user and logout on authenticated estimator routes", async () => {
    renderAppShell({
      route: "/estimator",
      repository: createRepository({
        session: createSession("admin01", "admin"),
      }),
    });

    expect(await screen.findByText("Estimator Screen")).toBeTruthy();
    expect(screen.getByTestId("global-auth-user").textContent).toBe(
      "Admin User"
    );
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "비밀번호 변경" })
    ).toBeTruthy();
    expect(screen.queryByText(/email/i)).toBeNull();
  });

  it("falls back to login_id when display_name is missing", async () => {
    const session = createSession("sales01", "sales");
    session.user.display_name = "";

    renderAppShell({
      route: "/estimator",
      repository: createRepository({ session }),
    });

    expect(await screen.findByText("Estimator Screen")).toBeTruthy();
    expect(screen.getByTestId("global-auth-user").textContent).toBe("sales01");
  });

  it("shows logout on the standard effort meta route", async () => {
    renderAppShell({
      route: "/standard-effort-meta",
      repository: createRepository({
        session: createSession("admin01", "admin"),
      }),
    });

    expect(await screen.findByText("Standard Effort Meta Screen")).toBeTruthy();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
  });

  it("opens and closes the password change panel without email wording", async () => {
    renderAppShell({
      route: "/estimator",
      repository: createRepository({
        session: createSession("admin01", "admin"),
      }),
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "비밀번호 변경" })
    );

    expect(screen.getByLabelText("현재 비밀번호")).toBeTruthy();
    expect(screen.getByLabelText("새 비밀번호")).toBeTruthy();
    expect(screen.getByLabelText("새 비밀번호 확인")).toBeTruthy();
    expect(screen.queryByText(/email/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("현재 비밀번호")).toBeNull()
    );
  });

  it("shows a local password confirmation error", async () => {
    const repository = createRepository({
      session: createSession("sales01", "sales"),
    });

    renderAppShell({
      route: "/estimator",
      repository,
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "비밀번호 변경" })
    );
    fireEvent.change(screen.getByLabelText("현재 비밀번호"), {
      target: { value: "current-secret" },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호"), {
      target: { value: "new-secret-123" },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), {
      target: { value: "different-secret-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(
      await screen.findByText("새 비밀번호 확인이 일치하지 않습니다.")
    ).toBeTruthy();
    expect(repository.changePassword).not.toHaveBeenCalled();
  });

  it("shows API password validation errors and keeps the panel open", async () => {
    const repository = createRepository({
      session: createSession("sales01", "sales"),
    });
    repository.changePassword.mockRejectedValue(
      new Error("new_password must be at least 4 characters.")
    );

    renderAppShell({
      route: "/estimator",
      repository,
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "비밀번호 변경" })
    );
    fireEvent.change(screen.getByLabelText("현재 비밀번호"), {
      target: { value: "current-secret" },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(
      await screen.findByText("new_password must be at least 4 characters.")
    ).toBeTruthy();
    expect(screen.getByLabelText("현재 비밀번호")).toBeTruthy();
    expect(screen.getByTestId("global-auth-user").textContent).toBe(
      "Admin User"
    );
    expect(screen.queryByText("Effort Estimator 로그인")).toBeNull();
  });

  it("changes password and returns to the full-screen login page", async () => {
    const repository = createRepository({
      session: createSession("viewer01", "viewer"),
    });

    renderAppShell({
      route: "/estimator",
      repository,
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "비밀번호 변경" })
    );
    fireEvent.change(screen.getByLabelText("현재 비밀번호"), {
      target: { value: "current-secret" },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호"), {
      target: { value: "new-secret-123" },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), {
      target: { value: "new-secret-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() =>
      expect(repository.changePassword).toHaveBeenCalledWith({
        currentPassword: "current-secret",
        newPassword: "new-secret-123",
        newPasswordConfirm: "new-secret-123",
      })
    );
    expect(
      await screen.findByText("비밀번호가 변경되었습니다. 다시 로그인해 주세요.")
    ).toBeTruthy();
    expect(await screen.findByText("Effort Estimator 로그인")).toBeTruthy();
    expect(document.querySelector("aside")).toBeNull();
    expect(screen.queryByTestId("global-auth-user")).toBeNull();
  });

  it("returns to the login page after logout", async () => {
    const repository = createRepository({
      session: createSession("admin01", "admin"),
    });

    renderAppShell({
      route: "/estimator",
      repository,
    });

    fireEvent.click(await screen.findByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(repository.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Effort Estimator 로그인")).toBeTruthy();
    expect(document.querySelector("aside")).toBeNull();
    expect(screen.queryByTestId("global-auth-user")).toBeNull();
  });

  it("shows a disabled login notice outside app login mode", () => {
    renderWithProviders({
      authEnv: { VITE_AUTH_LOGIN_MODE: "disabled" },
      children: <LoginPage />,
    });

    expect(screen.getByText("Login disabled")).toBeTruthy();
  });
});
