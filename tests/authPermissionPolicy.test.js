import { describe, expect, it } from "vitest";

import {
  PERMISSIONS,
  ROLES,
  buildPermissionSnapshot,
  getPermissionsForRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  normalizePolicyPermissionCodes,
  normalizePolicyRoleCodes,
} from "../src/features/auth";

describe("auth permission policy", () => {
  it("maps admin to all June operating permissions", () => {
    const permissions = getPermissionsForRole(ROLES.ADMIN);

    expect(permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.ROUTE_ESTIMATOR_READ,
        PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ,
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.STANDARD_EFFORT_SOLUTION_WRITE,
        PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE,
        PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE,
        PERMISSIONS.STANDARD_EFFORT_META_BASE_EFFORT_WRITE,
        PERMISSIONS.STANDARD_EFFORT_META_COEFFICIENT_WRITE,
        PERMISSIONS.STANDARD_EFFORT_META_ACTIVE_WRITE,
        PERMISSIONS.EXPORT_STANDARD_EFFORT,
        PERMISSIONS.AUDIT_READ,
      ])
    );
  });

  it("maps sales to project and selection writes without actual effort or meta access", () => {
    const permissions = getPermissionsForRole(ROLES.SALES);

    expect(permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.ROUTE_ESTIMATOR_READ,
        PERMISSIONS.ROUTE_PROJECTS_READ,
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.STANDARD_EFFORT_SOLUTION_WRITE,
        PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE,
        PERMISSIONS.STANDARD_EFFORT_SELECTION_WRITE,
        PERMISSIONS.STANDARD_EFFORT_REFRESH,
        PERMISSIONS.EXPORT_STANDARD_EFFORT,
      ])
    );
    expect(permissions).not.toContain(
      PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE
    );
    expect(permissions).not.toContain(PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ);
    expect(permissions).not.toContain(
      PERMISSIONS.STANDARD_EFFORT_META_BASE_EFFORT_WRITE
    );
    expect(permissions).not.toContain(
      PERMISSIONS.STANDARD_EFFORT_META_COEFFICIENT_WRITE
    );
    expect(permissions).not.toContain(PERMISSIONS.AUDIT_READ);
  });

  it("maps viewer to read/export permissions without writes", () => {
    const permissions = getPermissionsForRole(ROLES.VIEWER);

    expect(permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.ROUTE_ESTIMATOR_READ,
        PERMISSIONS.ROUTE_PROJECTS_READ,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.STANDARD_EFFORT_READ,
        PERMISSIONS.EXPORT_STANDARD_EFFORT,
      ])
    );
    expect(permissions).not.toContain(PERMISSIONS.PROJECT_CREATE);
    expect(permissions).not.toContain(PERMISSIONS.PROJECT_UPDATE);
    expect(permissions).not.toContain(
      PERMISSIONS.STANDARD_EFFORT_SOLUTION_WRITE
    );
    expect(permissions).not.toContain(PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE);
    expect(permissions).not.toContain(
      PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE
    );
    expect(permissions).not.toContain(PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ);
  });

  it("does not grant permissions for unknown roles", () => {
    expect(getPermissionsForRole("unknown_role")).toEqual([]);
  });

  it("builds a deduplicated permission snapshot from roles and explicit permissions", () => {
    const snapshot = buildPermissionSnapshot({
      roleCodes: [ROLES.SALES, ROLES.SALES],
      permissionCodes: [
        PERMISSIONS.EXPORT_STANDARD_EFFORT,
        PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE,
      ],
    });

    expect(snapshot.roleCodes).toEqual([ROLES.SALES]);
    expect(snapshot.permissionCodes.filter(
      (code) => code === PERMISSIONS.EXPORT_STANDARD_EFFORT
    )).toHaveLength(1);
    expect(snapshot.permissionCodes).toEqual(
      expect.arrayContaining([
        PERMISSIONS.STANDARD_EFFORT_SOLUTION_WRITE,
        PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE,
        PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE,
      ])
    );
    expect(snapshot.permissions).toEqual(
      expect.arrayContaining([
        {
          permission_code: PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE,
          active: true,
        },
      ])
    );
  });

  it("safely normalizes empty policy inputs", () => {
    expect(normalizePolicyRoleCodes(null)).toEqual([]);
    expect(normalizePolicyPermissionCodes(undefined)).toEqual([]);
    expect(buildPermissionSnapshot()).toEqual({
      roleCodes: [],
      permissionCodes: [],
      permissions: [],
    });
  });

  it("supports existing permission helper checks with policy snapshots", () => {
    const snapshot = buildPermissionSnapshot({
      roleCodes: [ROLES.ADMIN],
    });

    expect(
      hasPermission(snapshot.permissionCodes, PERMISSIONS.AUDIT_READ)
    ).toBe(true);
    expect(
      hasAnyPermission(snapshot.permissionCodes, [
        PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE,
        "missing.permission",
      ])
    ).toBe(true);
    expect(
      hasAllPermissions(snapshot.permissionCodes, [
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.EXPORT_STANDARD_EFFORT,
      ])
    ).toBe(true);
  });
});
