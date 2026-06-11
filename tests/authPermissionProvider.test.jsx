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
});
