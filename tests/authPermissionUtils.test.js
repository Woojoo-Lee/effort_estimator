import { describe, expect, it } from "vitest";

import { PERMISSIONS, ROLES } from "../src/features/auth";
import {
  buildAuthzSnapshot,
  buildPermissionSet,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  normalizePermissionCodes,
  normalizeRoleCodes,
} from "../src/features/auth";

describe("auth permission utils", () => {
  it("returns an empty unauthenticated snapshot for null input", () => {
    const snapshot = buildAuthzSnapshot();

    expect(snapshot.user).toBeNull();
    expect(snapshot.roleCodes).toEqual([]);
    expect(snapshot.permissionCodes).toEqual([]);
    expect(snapshot.isAuthenticated).toBe(false);
    expect(snapshot.hasPermission(PERMISSIONS.ROUTE_ESTIMATOR_READ)).toBe(
      false
    );
  });

  it("normalizes role and permission codes with duplicates removed", () => {
    expect(
      normalizeRoleCodes([
        ROLES.ESTIMATOR,
        { role_code: ROLES.ESTIMATOR },
        { role_code: ROLES.VIEWER, active: false },
        "",
        null,
      ])
    ).toEqual([ROLES.ESTIMATOR]);

    expect(
      normalizePermissionCodes([
        PERMISSIONS.EXPORT_READ,
        { permission_code: PERMISSIONS.EXPORT_READ },
        { permission_code: PERMISSIONS.AUDIT_READ, active: false },
      ])
    ).toEqual([PERMISSIONS.EXPORT_READ]);
  });

  it("checks permission sets", () => {
    const permissionSet = buildPermissionSet([
      PERMISSIONS.ROUTE_ESTIMATOR_READ,
      PERMISSIONS.EXPORT_READ,
    ]);

    expect(hasPermission(permissionSet, PERMISSIONS.EXPORT_READ)).toBe(true);
    expect(
      hasAnyPermission(permissionSet, [
        PERMISSIONS.AUDIT_READ,
        PERMISSIONS.EXPORT_READ,
      ])
    ).toBe(true);
    expect(
      hasAllPermissions(permissionSet, [
        PERMISSIONS.ROUTE_ESTIMATOR_READ,
        PERMISSIONS.EXPORT_READ,
      ])
    ).toBe(true);
    expect(
      hasAllPermissions(permissionSet, [
        PERMISSIONS.ROUTE_ESTIMATOR_READ,
        PERMISSIONS.AUDIT_READ,
      ])
    ).toBe(false);
  });

  it("checks roles", () => {
    const roles = [ROLES.ESTIMATOR, ROLES.VIEWER];

    expect(hasRole(roles, ROLES.ESTIMATOR)).toBe(true);
    expect(hasRole(roles, ROLES.SYSTEM_ADMIN)).toBe(false);
    expect(hasAnyRole(roles, [ROLES.SYSTEM_ADMIN, ROLES.VIEWER])).toBe(true);
  });

  it("does not grant all permissions automatically for system_admin", () => {
    const snapshot = buildAuthzSnapshot({
      user: { user_id: "user-1", active: true, status: "active" },
      roles: [{ role_code: ROLES.SYSTEM_ADMIN }],
      permissions: [],
    });

    expect(snapshot.isAuthenticated).toBe(true);
    expect(snapshot.isSystemAdmin).toBe(true);
    expect(snapshot.hasPermission(PERMISSIONS.USER_MANAGE)).toBe(false);
  });

  it("builds role booleans from normalized roles", () => {
    const snapshot = buildAuthzSnapshot({
      user: { user_id: "user-1", active: true, status: "active" },
      roles: [
        { role_code: ROLES.ADMIN },
        { role_code: ROLES.SALES },
        { role_code: ROLES.SYSTEM_ADMIN },
        { role_code: ROLES.META_ADMIN },
        { role_code: ROLES.ESTIMATOR },
        { role_code: ROLES.VIEWER },
      ],
      permissions: [PERMISSIONS.ROUTE_ESTIMATOR_READ],
    });

    expect(snapshot.isSystemAdmin).toBe(true);
    expect(snapshot.isAdmin).toBe(true);
    expect(snapshot.isSales).toBe(true);
    expect(snapshot.isMetaAdmin).toBe(true);
    expect(snapshot.isEstimator).toBe(true);
    expect(snapshot.isViewer).toBe(true);
    expect(snapshot.hasPermission(PERMISSIONS.ROUTE_ESTIMATOR_READ)).toBe(true);
  });

  it("adds role-derived permissions without granting unknown roles", () => {
    const snapshot = buildAuthzSnapshot({
      user: { user_id: "user-1", active: true, status: "active" },
      roles: [ROLES.SALES, "unknown_role"],
      permissions: [],
    });

    expect(snapshot.hasPermission(PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE)).toBe(
      true
    );
    expect(
      snapshot.hasPermission(PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)
    ).toBe(false);
    expect(snapshot.hasPermission(PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ)).toBe(
      false
    );
  });
});
