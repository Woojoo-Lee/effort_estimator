// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppRouter from "../src/app/AppRouter";
import { getAppRoutes } from "../src/app/routes";
import {
  AuthPermissionProvider,
  PERMISSIONS,
  ROLES,
  buildAuthzSnapshot,
  canAccessRoute,
  filterRoutesByAuthz,
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

describe("route authz helpers", () => {
  it("allows routes without permissions in disabled mode", () => {
    expect(
      canAccessRoute(
        { requiredPermissions: [PERMISSIONS.ROUTE_ESTIMATOR_READ] },
        buildAuthzSnapshot(),
        { env: { VITE_AUTH_PERMISSION_MODE: "disabled" } }
      )
    ).toBe(true);
  });

  it("allows routes without required permissions in dev mode", () => {
    expect(
      canAccessRoute({}, buildAuthzSnapshot(), {
        env: { VITE_AUTH_PERMISSION_MODE: "dev" },
      })
    ).toBe(true);
  });

  it("requires all required permissions in dev mode", () => {
    const route = {
      requiredPermissions: [PERMISSIONS.ROUTE_ESTIMATOR_READ],
    };

    expect(
      canAccessRoute(route, buildAuthzSnapshot(), {
        env: { VITE_AUTH_PERMISSION_MODE: "dev" },
      })
    ).toBe(false);

    expect(
      canAccessRoute(
        route,
        buildAuthzSnapshot({
          permissions: [PERMISSIONS.ROUTE_ESTIMATOR_READ],
        }),
        { env: { VITE_AUTH_PERMISSION_MODE: "dev" } }
      )
    ).toBe(true);
  });

  it("allows any permission matches and does not auto-grant system_admin", () => {
    const route = {
      anyPermissions: [PERMISSIONS.AUDIT_READ, PERMISSIONS.EXPORT_READ],
    };
    const systemAdminWithoutPermissions = buildAuthzSnapshot({
      user: { user_id: "user-1", active: true, status: "active" },
      roles: [ROLES.SYSTEM_ADMIN],
      permissions: [],
    });
    const exportUser = buildAuthzSnapshot({
      permissions: [PERMISSIONS.EXPORT_READ],
    });

    expect(
      canAccessRoute(route, systemAdminWithoutPermissions, {
        env: { VITE_AUTH_PERMISSION_MODE: "dev" },
      })
    ).toBe(false);
    expect(
      canAccessRoute(route, exportUser, {
        env: { VITE_AUTH_PERMISSION_MODE: "dev" },
      })
    ).toBe(true);
  });

  it("filters routes by authz only when auth permission mode is enabled", () => {
    const routes = [
      { path: "/a", requiredPermissions: [PERMISSIONS.AUDIT_READ] },
      { path: "/b", requiredPermissions: [PERMISSIONS.EXPORT_READ] },
    ];
    const authz = buildAuthzSnapshot({
      permissions: [PERMISSIONS.EXPORT_READ],
    });

    expect(
      filterRoutesByAuthz(routes, authz, {
        env: { VITE_AUTH_PERMISSION_MODE: "disabled" },
      })
    ).toHaveLength(2);
    expect(
      filterRoutesByAuthz(routes, authz, {
        env: { VITE_AUTH_PERMISSION_MODE: "dev" },
      }).map((route) => route.path)
    ).toEqual(["/b"]);
  });
});

describe("route and sidebar guards", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("keeps existing sidebar routes visible in disabled mode", () => {
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");

    render(
      <AuthPermissionProvider env={{ VITE_AUTH_PERMISSION_MODE: "disabled" }}>
        <AppSidebar activeRoute="/estimator" />
      </AuthPermissionProvider>
    );

    const hrefs = [...document.querySelectorAll("a")].map((link) =>
      link.getAttribute("href")
    );

    expect(hrefs).toEqual(getAppRoutes().map((route) => `#${route.path}`));
  });

  it("hides standard effort meta from dev viewers without route permission", async () => {
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.ROUTE_ESTIMATOR_READ,
        }}
      >
        <AppSidebar activeRoute="/estimator" />
      </AuthPermissionProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('a[href="#/estimator"]')).toBeTruthy();
    });
    expect(
      document.querySelector('a[href="#/standard-effort-meta"]')
    ).toBeNull();
  });

  it("shows standard effort meta for dev users with route permission", async () => {
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: [
            PERMISSIONS.ROUTE_ESTIMATOR_READ,
            PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ,
          ].join(","),
        }}
      >
        <AppSidebar activeRoute="/standard-effort-meta" />
      </AuthPermissionProvider>
    );

    await waitFor(() => {
      expect(
        document.querySelector('a[href="#/standard-effort-meta"]')
      ).toBeTruthy();
    });
  });

  it("blocks direct URL access when route permission is missing", () => {
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.ROUTE_ESTIMATOR_READ,
        }}
      >
        <AppRouter route="/standard-effort-meta" />
      </AuthPermissionProvider>
    );

    expect(screen.getByText("접근 권한이 없습니다.")).toBeTruthy();
  });

  it("blocks standard effort meta when the feature flag is disabled even with permission", () => {
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "false");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES:
            PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ,
        }}
      >
        <AppRouter route="/standard-effort-meta" />
      </AuthPermissionProvider>
    );

    expect(screen.getByText("접근 권한이 없습니다.")).toBeTruthy();
  });
});
