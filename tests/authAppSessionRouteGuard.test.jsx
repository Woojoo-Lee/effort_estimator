// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppRouter from "../src/app/AppRouter";
import {
  AuthPermissionProvider,
  AuthSessionProvider,
  ROLES,
} from "../src/features/auth";
import AppSidebar from "../src/features/layout/components/AppSidebar";

vi.mock("../src/features/codebooks/pages/CodebookPage", () => ({
  default: () => <div data-testid="codebooks-page" />,
}));
vi.mock("../src/features/estimator/pages/EstimatorPage", () => ({
  default: () => <div data-testid="estimator-page" />,
}));
vi.mock("../src/features/itemMeta/pages/ItemMetaPage", () => ({
  default: () => <div data-testid="item-meta-page" />,
}));
vi.mock("../src/features/projects/pages/ProjectPage", () => ({
  default: () => <div data-testid="projects-page" />,
}));
vi.mock("../src/features/standardEffortMeta/pages/StandardEffortMetaPage", () => ({
  default: () => <div data-testid="standard-effort-meta-page" />,
}));

function createSessionRepository(user) {
  return {
    getAuthSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user,
        },
      },
      error: null,
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({})),
  };
}

function renderWithAppSession(user, children) {
  return render(
    <AuthSessionProvider
      env={{ VITE_AUTH_LOGIN_MODE: "app" }}
      repository={createSessionRepository(user)}
    >
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "enabled",
        }}
      >
        {children}
      </AuthPermissionProvider>
    </AuthSessionProvider>
  );
}

describe("app session route guards", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("allows standard effort meta for an enabled app admin session", async () => {
    vi.stubEnv("VITE_AUTH_LOGIN_MODE", "app");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "enabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");

    renderWithAppSession(
      {
        user_id: "app-user-1",
        login_id: "admin01",
        display_name: "Admin User",
        role_code: ROLES.ADMIN,
        role_codes: [ROLES.ADMIN],
      },
      <>
        <AppSidebar activeRoute="/standard-effort-meta" />
        <AppRouter route="/standard-effort-meta" />
      </>
    );

    expect(await screen.findByTestId("standard-effort-meta-page")).toBeTruthy();
    expect(
      document.querySelector('a[href="#/standard-effort-meta"]')
    ).toBeTruthy();
  });

  it("blocks standard effort meta for enabled app sales sessions", async () => {
    vi.stubEnv("VITE_AUTH_LOGIN_MODE", "app");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "enabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");

    renderWithAppSession(
      {
        user_id: "app-user-2",
        login_id: "sales01",
        display_name: "Sales User",
        role_code: ROLES.SALES,
        role_codes: [ROLES.SALES],
      },
      <>
        <AppSidebar activeRoute="/estimator" />
        <AppRouter route="/standard-effort-meta" />
      </>
    );

    await waitFor(() => {
      expect(document.querySelector('a[href="#/estimator"]')).toBeTruthy();
    });
    expect(
      document.querySelector('a[href="#/standard-effort-meta"]')
    ).toBeNull();
    expect(screen.getByText("접근 권한이 없습니다.")).toBeTruthy();
  });

  it("blocks standard effort meta for enabled app viewer sessions", async () => {
    vi.stubEnv("VITE_AUTH_LOGIN_MODE", "app");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "enabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");

    renderWithAppSession(
      {
        user_id: "app-user-3",
        login_id: "viewer01",
        display_name: "Viewer User",
        role_code: ROLES.VIEWER,
        role_codes: [ROLES.VIEWER],
      },
      <AppRouter route="/standard-effort-meta" />
    );

    await waitFor(() => {
      expect(screen.getByText("접근 권한이 없습니다.")).toBeTruthy();
    });
  });
});
