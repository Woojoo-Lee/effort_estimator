import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS, ROLES } from "../src/features/auth";
import {
  fetchAppUserByEmail,
  fetchPermissionSnapshotByEmail,
  fetchRolePermissions,
  fetchUserRoles,
} from "../src/features/auth";

function createQuery(table, data, error = null) {
  const query = {
    table,
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve, reject) =>
      Promise.resolve({ data, error }).then(resolve, reject),
  };

  return query;
}

function createClient(tableData = {}, tableErrors = {}) {
  const queries = [];
  const client = {
    queries,
    from: vi.fn((table) => {
      const query = createQuery(
        table,
        tableData[table] || [],
        tableErrors[table] || null
      );
      queries.push(query);
      return query;
    }),
  };

  return client;
}

describe("authPermissionRepository", () => {
  it("fetches active app users by email", async () => {
    const client = createClient({
      app_users: [
        {
          user_id: "inactive",
          email: "user@example.com",
          status: "inactive",
          active: true,
        },
        {
          user_id: "user-1",
          email: "user@example.com",
          status: "active",
          active: true,
        },
      ],
    });

    const user = await fetchAppUserByEmail("user@example.com", client);

    expect(user.user_id).toBe("user-1");
    expect(client.from).toHaveBeenCalledWith("app_users");
    expect(client.queries[0].eq).toHaveBeenCalledWith("email", "user@example.com");
    expect(client.queries[0].eq).toHaveBeenCalledWith("active", true);
    expect(client.queries[0].eq).toHaveBeenCalledWith("status", "active");
  });

  it("returns null when an app user is not found", async () => {
    const client = createClient({ app_users: [] });

    await expect(fetchAppUserByEmail("missing@example.com", client)).resolves.toBeNull();
  });

  it("fetches current active user roles and excludes expired or inactive role assignments", async () => {
    const client = createClient({
      app_user_roles: [
        {
          user_id: "user-1",
          role_code: ROLES.ESTIMATOR,
          active: true,
          starts_at: "2020-01-01T00:00:00.000Z",
          ends_at: null,
        },
        {
          user_id: "user-1",
          role_code: ROLES.VIEWER,
          active: true,
          starts_at: "2020-01-01T00:00:00.000Z",
          ends_at: "2020-01-02T00:00:00.000Z",
        },
        {
          user_id: "user-1",
          role_code: ROLES.META_ADMIN,
          active: false,
        },
      ],
      app_roles: [
        { role_code: ROLES.ESTIMATOR, active: true },
        { role_code: ROLES.VIEWER, active: true },
        { role_code: ROLES.META_ADMIN, active: true },
      ],
    });

    const roles = await fetchUserRoles("user-1", client);

    expect(roles.map((role) => role.role_code)).toEqual([ROLES.ESTIMATOR]);
    expect(client.queries[0].eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(client.queries[0].eq).toHaveBeenCalledWith("active", true);
  });

  it("fetches allowed permissions for active roles and active permissions only", async () => {
    const client = createClient({
      app_roles: [
        { role_code: ROLES.ESTIMATOR, active: true },
        { role_code: ROLES.VIEWER, active: false },
      ],
      app_role_permissions: [
        {
          role_code: ROLES.ESTIMATOR,
          permission_code: PERMISSIONS.ROUTE_ESTIMATOR_READ,
          allowed: true,
        },
        {
          role_code: ROLES.ESTIMATOR,
          permission_code: PERMISSIONS.AUDIT_READ,
          allowed: false,
        },
        {
          role_code: ROLES.VIEWER,
          permission_code: PERMISSIONS.EXPORT_READ,
          allowed: true,
        },
      ],
      app_permissions: [
        {
          permission_code: PERMISSIONS.ROUTE_ESTIMATOR_READ,
          active: true,
        },
        {
          permission_code: PERMISSIONS.EXPORT_READ,
          active: true,
        },
        {
          permission_code: PERMISSIONS.AUDIT_READ,
          active: true,
        },
      ],
    });

    const permissions = await fetchRolePermissions(
      [ROLES.ESTIMATOR, ROLES.VIEWER],
      client
    );

    expect(permissions.map((permission) => permission.permission_code)).toEqual([
      PERMISSIONS.ROUTE_ESTIMATOR_READ,
    ]);
    expect(client.queries.every((query) => query.select.mock.calls[0][0] === "*")).toBe(
      true
    );
  });

  it("combines user, roles, and permissions into a snapshot", async () => {
    const client = createClient({
      app_users: [
        {
          user_id: "user-1",
          email: "user@example.com",
          status: "active",
          active: true,
        },
      ],
      app_user_roles: [
        { user_id: "user-1", role_code: ROLES.ESTIMATOR, active: true },
      ],
      app_roles: [{ role_code: ROLES.ESTIMATOR, active: true }],
      app_role_permissions: [
        {
          role_code: ROLES.ESTIMATOR,
          permission_code: PERMISSIONS.STANDARD_EFFORT_REFRESH,
          allowed: true,
        },
      ],
      app_permissions: [
        {
          permission_code: PERMISSIONS.STANDARD_EFFORT_REFRESH,
          active: true,
        },
      ],
    });

    const snapshot = await fetchPermissionSnapshotByEmail(
      "user@example.com",
      client
    );

    expect(snapshot.user.user_id).toBe("user-1");
    expect(snapshot.roleCodes).toEqual([ROLES.ESTIMATOR]);
    expect(snapshot.permissionCodes).toEqual([
      PERMISSIONS.STANDARD_EFFORT_REFRESH,
    ]);
  });

  it("throws Supabase errors", async () => {
    const error = new Error("boom");
    const client = createClient({}, { app_users: error });

    await expect(fetchAppUserByEmail("user@example.com", client)).rejects.toThrow(
      "boom"
    );
  });
});
