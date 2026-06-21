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
import LoginForm from "../src/features/auth/components/LoginForm";
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

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
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

function getLoginIdInput() {
  return document.querySelector('input[type="text"]');
}

function getPasswordInputs() {
  return Array.from(document.querySelectorAll('input[type="password"]'));
}

function getSubmitButton() {
  return document.querySelector('button[type="submit"]');
}

function submitCurrentForm() {
  fireEvent.submit(document.querySelector("form"));
}

function fillLoginForm({ loginId = "sales01", password = "secret" } = {}) {
  fireEvent.change(getLoginIdInput(), {
    target: { value: loginId },
  });
  fireEvent.change(getPasswordInputs()[0], {
    target: { value: password },
  });
}

function getAccountBarButtons() {
  const accountBar = screen.getByTestId("global-auth-user").parentElement;
  return within(accountBar).getAllByRole("button");
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

    expect(document.querySelector("h1")?.textContent).toContain(
      "Effort Estimator"
    );
    expect(getLoginIdInput()).toBeTruthy();
    expect(getPasswordInputs()).toHaveLength(1);
    expect(getPasswordInputs()[0].type).toBe("password");
    expect(document.body.textContent.toLowerCase()).not.toContain("email");
    expect(screen.queryByTestId("global-auth-user")).toBeNull();
    expect(document.querySelector("aside")).toBeNull();
  });

  it("submits app login credentials", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ data: null, error: null });

    render(<LoginForm onSubmit={onSubmit} />);

    fillLoginForm();
    submitCurrentForm();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        loginId: "sales01",
        password: "secret",
      })
    );
  });

  it("shows login progress and prevents duplicate submit while pending", async () => {
    const deferred = createDeferred();
    const onSubmit = vi.fn().mockReturnValue(deferred.promise);

    render(<LoginForm onSubmit={onSubmit} />);

    fillLoginForm();
    submitCurrentForm();

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(getSubmitButton().disabled).toBe(true);
    expect(getSubmitButton().getAttribute("aria-busy")).toBe("true");
    expect(getLoginIdInput().disabled).toBe(true);
    expect(getPasswordInputs()[0].disabled).toBe(true);

    submitCurrentForm();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    deferred.resolve({ data: null, error: null });

    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("shows an app login error message and re-enables the button on sign-in failure", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("invalid credentials"));

    render(<LoginForm onSubmit={onSubmit} />);

    fillLoginForm({ loginId: "viewer01", password: "wrong" });
    submitCurrentForm();

    expect(await screen.findByText("invalid credentials")).toBeTruthy();
    expect(getSubmitButton().disabled).toBe(false);
    expect(getLoginIdInput().disabled).toBe(false);
    expect(getPasswordInputs()[0].disabled).toBe(false);
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

    expect(await screen.findByText(/Effort Estimator/)).toBeTruthy();
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

  it("shows the current app user and account buttons on authenticated estimator routes", async () => {
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
    expect(getAccountBarButtons()).toHaveLength(2);
    expect(document.body.textContent.toLowerCase()).not.toContain("email");
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

  it("shows account buttons on the standard effort meta route", async () => {
    renderAppShell({
      route: "/standard-effort-meta",
      repository: createRepository({
        session: createSession("admin01", "admin"),
      }),
    });

    expect(await screen.findByText("Standard Effort Meta Screen")).toBeTruthy();
    expect(getAccountBarButtons()).toHaveLength(2);
  });

  it("opens and closes the password change panel without email wording", async () => {
    renderAppShell({
      route: "/estimator",
      repository: createRepository({
        session: createSession("admin01", "admin"),
      }),
    });

    await screen.findByText("Estimator Screen");
    fireEvent.click(getAccountBarButtons()[0]);

    expect(getPasswordInputs()).toHaveLength(3);
    expect(document.body.textContent.toLowerCase()).not.toContain("email");

    const panel = getPasswordInputs()[0].closest("form");
    fireEvent.click(within(panel).getAllByRole("button")[0]);

    await waitFor(() => expect(getPasswordInputs()).toHaveLength(0));
  });

  it("shows a local password confirmation error", async () => {
    const repository = createRepository({
      session: createSession("sales01", "sales"),
    });

    renderAppShell({
      route: "/estimator",
      repository,
    });

    await screen.findByText("Estimator Screen");
    fireEvent.click(getAccountBarButtons()[0]);

    const passwordInputs = getPasswordInputs();
    fireEvent.change(passwordInputs[0], { target: { value: "current-secret" } });
    fireEvent.change(passwordInputs[1], { target: { value: "new-secret-123" } });
    fireEvent.change(passwordInputs[2], {
      target: { value: "different-secret-123" },
    });
    fireEvent.click(getSubmitButton());

    await waitFor(() => expect(repository.changePassword).not.toHaveBeenCalled());
    expect(getPasswordInputs()).toHaveLength(3);
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

    await screen.findByText("Estimator Screen");
    fireEvent.click(getAccountBarButtons()[0]);

    const passwordInputs = getPasswordInputs();
    fireEvent.change(passwordInputs[0], { target: { value: "current-secret" } });
    fireEvent.change(passwordInputs[1], { target: { value: "abc" } });
    fireEvent.change(passwordInputs[2], { target: { value: "abc" } });
    fireEvent.click(getSubmitButton());

    expect(
      await screen.findByText("new_password must be at least 4 characters.")
    ).toBeTruthy();
    expect(getPasswordInputs()).toHaveLength(3);
    expect(screen.getByTestId("global-auth-user").textContent).toBe(
      "Admin User"
    );
    expect(screen.queryByTestId("global-auth-user")).toBeTruthy();
  });

  it("changes password and returns to the full-screen login page", async () => {
    const repository = createRepository({
      session: createSession("viewer01", "viewer"),
    });

    renderAppShell({
      route: "/estimator",
      repository,
    });

    await screen.findByText("Estimator Screen");
    fireEvent.click(getAccountBarButtons()[0]);

    const passwordInputs = getPasswordInputs();
    fireEvent.change(passwordInputs[0], { target: { value: "current-secret" } });
    fireEvent.change(passwordInputs[1], { target: { value: "new-secret-123" } });
    fireEvent.change(passwordInputs[2], {
      target: { value: "new-secret-123" },
    });
    fireEvent.click(getSubmitButton());

    await waitFor(() =>
      expect(repository.changePassword).toHaveBeenCalledWith({
        currentPassword: "current-secret",
        newPassword: "new-secret-123",
        newPasswordConfirm: "new-secret-123",
      })
    );
    expect(await screen.findByText(/Effort Estimator/)).toBeTruthy();
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

    await screen.findByText("Estimator Screen");
    fireEvent.click(getAccountBarButtons()[1]);

    await waitFor(() => expect(repository.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Effort Estimator/)).toBeTruthy();
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
