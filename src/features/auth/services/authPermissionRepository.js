import { supabase } from "../../../services/supabaseClient";
import {
  normalizePermissionCodes,
  normalizeRoleCodes,
} from "../lib/permissionUtils";

const TABLES = {
  users: "app_users",
  roles: "app_roles",
  permissions: "app_permissions",
  userRoles: "app_user_roles",
  rolePermissions: "app_role_permissions",
};

function getClient(client) {
  const dbClient = client || supabase;

  if (!dbClient) {
    throw new Error("Supabase client not initialized.");
  }

  return dbClient;
}

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

function toArray(data) {
  if (!data) {
    return [];
  }

  return Array.isArray(data) ? data : [data];
}

function isActive(row = {}) {
  return row.active !== false;
}

function isActiveUser(row = {}) {
  return isActive(row) && row.status === "active";
}

function isCurrentRoleAssignment(row = {}, now = new Date()) {
  if (!isActive(row)) {
    return false;
  }

  const startsAt = row.starts_at ? new Date(row.starts_at) : null;
  const endsAt = row.ends_at ? new Date(row.ends_at) : null;

  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

async function selectRows(query) {
  const { data, error } = await query;
  throwIfError(error);
  return toArray(data);
}

export async function fetchAppUserByEmail(email, client) {
  const trimmedEmail = String(email || "").trim();

  if (!trimmedEmail) {
    return null;
  }

  const dbClient = getClient(client);
  const rows = await selectRows(
    dbClient
      .from(TABLES.users)
      .select("*")
      .eq("email", trimmedEmail)
      .eq("active", true)
      .eq("status", "active")
      .limit(1)
  );

  return (
    rows.find((row) => row.email === trimmedEmail && isActiveUser(row)) || null
  );
}

export async function fetchAppUserByAuthUserId(authUserId, client) {
  const trimmedAuthUserId = String(authUserId || "").trim();

  if (!trimmedAuthUserId) {
    return null;
  }

  const dbClient = getClient(client);
  const rows = await selectRows(
    dbClient
      .from(TABLES.users)
      .select("*")
      .eq("auth_user_id", trimmedAuthUserId)
      .eq("active", true)
      .eq("status", "active")
      .limit(1)
  );

  return (
    rows.find(
      (row) => String(row.auth_user_id) === trimmedAuthUserId && isActiveUser(row)
    ) || null
  );
}

export async function fetchUserRoles(userId, client) {
  const trimmedUserId = String(userId || "").trim();

  if (!trimmedUserId) {
    return [];
  }

  const dbClient = getClient(client);
  const assignments = (
    await selectRows(
      dbClient
        .from(TABLES.userRoles)
        .select("*")
        .eq("user_id", trimmedUserId)
        .eq("active", true)
    )
  ).filter((row) => isCurrentRoleAssignment(row));
  const roleCodes = normalizeRoleCodes(assignments);

  if (roleCodes.length === 0) {
    return [];
  }

  const roles = await selectRows(
    dbClient
      .from(TABLES.roles)
      .select("*")
      .in("role_code", roleCodes)
      .eq("active", true)
  );

  return roles.filter((row) => isActive(row) && roleCodes.includes(row.role_code));
}

export async function fetchRolePermissions(roleCodes, client) {
  const normalizedRoleCodes = normalizeRoleCodes(roleCodes);

  if (normalizedRoleCodes.length === 0) {
    return [];
  }

  const dbClient = getClient(client);
  const activeRoles = await selectRows(
    dbClient
      .from(TABLES.roles)
      .select("*")
      .in("role_code", normalizedRoleCodes)
      .eq("active", true)
  );
  const activeRoleCodes = normalizeRoleCodes(activeRoles);

  if (activeRoleCodes.length === 0) {
    return [];
  }

  const rolePermissions = await selectRows(
    dbClient
      .from(TABLES.rolePermissions)
      .select("*")
      .in("role_code", activeRoleCodes)
      .eq("allowed", true)
  );
  const permissionCodes = normalizePermissionCodes(
    rolePermissions
      .filter(
        (row) =>
          row.allowed === true && activeRoleCodes.includes(row.role_code)
      )
      .map((row) => row.permission_code)
  );

  if (permissionCodes.length === 0) {
    return [];
  }

  const permissions = await selectRows(
    dbClient
      .from(TABLES.permissions)
      .select("*")
      .in("permission_code", permissionCodes)
      .eq("active", true)
  );

  return permissions.filter(
    (row) => isActive(row) && permissionCodes.includes(row.permission_code)
  );
}

export async function fetchPermissionSnapshotByEmail(email, client) {
  const user = await fetchAppUserByEmail(email, client);

  if (!user) {
    return {
      user: null,
      roles: [],
      permissions: [],
      roleCodes: [],
      permissionCodes: [],
    };
  }

  const roles = await fetchUserRoles(user.user_id, client);
  const roleCodes = normalizeRoleCodes(roles);
  const permissions = await fetchRolePermissions(roleCodes, client);
  const permissionCodes = normalizePermissionCodes(permissions);

  return {
    user,
    roles,
    permissions,
    roleCodes,
    permissionCodes,
  };
}

export async function fetchPermissionSnapshotByAuthUserId(authUserId, client) {
  const user = await fetchAppUserByAuthUserId(authUserId, client);

  if (!user) {
    return {
      user: null,
      roles: [],
      permissions: [],
      roleCodes: [],
      permissionCodes: [],
    };
  }

  const roles = await fetchUserRoles(user.user_id, client);
  const roleCodes = normalizeRoleCodes(roles);
  const permissions = await fetchRolePermissions(roleCodes, client);
  const permissionCodes = normalizePermissionCodes(permissions);

  return {
    user,
    roles,
    permissions,
    roleCodes,
    permissionCodes,
  };
}
