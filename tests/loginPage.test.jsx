// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
import { AuthPermissionProvider, AuthSessionProvider } from "../src/features/auth";
import LoginPage from "../src/features/auth/pages/LoginPage";

function createSession(email = "admin@example.com") {
  return {
    access_token: "token",
    user: {
      id: "auth-user-1",
      email,
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
    signInWithPassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })),
  };
}

function renderWithProviders({
  route = "/login",
  authEnv = { VITE_AUTH_LOGIN_MODE: "supabase" },
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

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("renders email and password inputs", () => {
    renderWithProviders({ children: <LoginPage /> });

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByLabelText("Password").type).toBe("password");
  });

  it("submits Supabase credentials and navigates to the default route", async () => {
    const repository = createRepository();
    repository.signInWithPassword.mockResolvedValue({
      data: {
        session: createSession("sales@example.com"),
      },
      error: null,
    });

    renderWithProviders({ repository, children: <LoginPage /> });

    const loginButton = await screen.findByRole("button", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "sales@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(loginButton);

    await waitFor(() =>
      expect(repository.signInWithPassword).toHaveBeenCalledWith({
        email: "sales@example.com",
        password: "secret",
      })
    );
    await waitFor(() => expect(window.location.hash).toBe("#/estimator"));
  });

  it("shows an error message on sign-in failure", async () => {
    const repository = createRepository();
    repository.signInWithPassword.mockRejectedValue(new Error("Invalid login"));

    renderWithProviders({ repository, children: <LoginPage /> });

    const loginButton = await screen.findByRole("button", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "viewer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(loginButton);

    expect(await screen.findByText("Invalid login")).toBeTruthy();
  });

  it("keeps the existing estimator route available when login mode is disabled", () => {
    renderWithProviders({
      route: "/estimator",
      authEnv: { VITE_AUTH_LOGIN_MODE: "disabled" },
    });

    expect(screen.getByText("Estimator Screen")).toBeTruthy();
  });

  it("shows login for protected app routes when Supabase session is missing", async () => {
    renderWithProviders({
      route: "/estimator",
      repository: createRepository({ session: null }),
    });

    expect(await screen.findByText("Effort Estimator Login")).toBeTruthy();
  });

  it("shows the requested app route when a Supabase session exists", async () => {
    renderWithProviders({
      route: "/estimator",
      repository: createRepository({
        session: createSession("admin@example.com"),
      }),
    });

    expect(await screen.findByText("Estimator Screen")).toBeTruthy();
  });

  it("shows a disabled login notice outside Supabase login mode", () => {
    renderWithProviders({
      authEnv: { VITE_AUTH_LOGIN_MODE: "disabled" },
      children: <LoginPage />,
    });

    expect(screen.getByText("Login disabled")).toBeTruthy();
  });
});
