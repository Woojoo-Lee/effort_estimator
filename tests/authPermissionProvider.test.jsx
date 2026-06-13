// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS, ROLES } from "../src/features/auth";

const fetchPermissionSnapshotByEmail = vi.hoisted(() => vi.fn());

vi.mock("../src/features/auth/services/authPermissionRepository", () => ({
  fetchPermissionSnapshotByEmail,
}));

import {
  AuthPermissionProvider,
  AuthSessionProvider,
  useAuthPermission,
} from "../src/features/auth";

function Reader() {
  const auth = useAuthPermission();

  return (
    <div>
      <div data-testid="authenticated">
        {String(auth.authz.isAuthenticated)}
      </div>
      <div data-testid="email">{auth.user?.email || ""}</div>
      <div data-testid="roles">{auth.authz.roleCodes.join(",")}</div>
      <div data-testid="permissions">
        {auth.authz.permissionCodes.join(",")}
      </div>
      <div data-testid="dev-only">{String(auth.devOnly)}</div>
    </div>
  );
}

describe("AuthPermissionProvider", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns an unauthenticated disabled state by default", () => {
    render(
      <AuthPermissionProvider env={{ VITE_AUTH_PERMISSION_MODE: "disabled" }}>
        <Reader />
      </AuthPermissionProvider>
    );

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("roles").textContent).toBe("");
    expect(screen.getByTestId("permissions").textContent).toBe("");
  });

  it("builds a development snapshot from env role and permission codes", async () => {
    fetchPermissionSnapshotByEmail.mockResolvedValue({
      user: null,
      roles: [],
      permissions: [],
      roleCodes: [],
      permissionCodes: [],
    });

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_EMAIL: "dev@example.com",
          VITE_DEV_AUTH_ROLE_CODES: ROLES.ESTIMATOR,
          VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.ROUTE_ESTIMATOR_READ,
        }}
      >
        <Reader />
      </AuthPermissionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
    expect(screen.getByTestId("email").textContent).toBe("dev@example.com");
    expect(screen.getByTestId("roles").textContent).toBe(ROLES.ESTIMATOR);
    expect(screen.getByTestId("permissions").textContent).toBe(
      PERMISSIONS.ROUTE_ESTIMATOR_READ
    );
    expect(screen.getByTestId("dev-only").textContent).toBe("true");
  });

  it("derives development permissions from admin sales viewer roles", async () => {
    fetchPermissionSnapshotByEmail.mockResolvedValue({
      user: null,
      roles: [],
      permissions: [],
      roleCodes: [],
      permissionCodes: [],
    });

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_EMAIL: "sales@example.com",
          VITE_DEV_AUTH_ROLE_CODES: ROLES.SALES,
        }}
      >
        <Reader />
      </AuthPermissionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
    const permissionText = screen.getByTestId("permissions").textContent;

    expect(permissionText).toContain(PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE);
    expect(permissionText).not.toContain(
      PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE
    );
    expect(permissionText).not.toContain(
      PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ
    );
  });

  it("derives permissions from an app session role_code", async () => {
    const repository = {
      getAuthSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              user_id: "app-user-1",
              login_id: "sales01",
              display_name: "Sales User",
              role_code: ROLES.SALES,
              role_codes: [ROLES.SALES],
            },
          },
        },
        error: null,
      }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({})),
    };

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <AuthPermissionProvider
          env={{
            VITE_AUTH_PERMISSION_MODE: "dev",
          }}
        >
          <Reader />
        </AuthPermissionProvider>
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
    expect(screen.getByTestId("roles").textContent).toBe(ROLES.SALES);
    const permissionText = screen.getByTestId("permissions").textContent;

    expect(permissionText).toContain(PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE);
    expect(permissionText).not.toContain(
      PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE
    );
  });
});
