import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  client: null,
  createClient: vi.fn(() => supabaseMocks.client),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

import loginHandler from "../api/auth/login.js";
import logoutHandler from "../api/auth/logout.js";
import sessionHandler from "../api/auth/session.js";
import changePasswordHandler from "../api/auth/change-password.js";
import usersHandler from "../api/auth/users.js";
import standardEffortLastChangeHandler from "../api/standard-effort/last-change.js";
import {
  APP_LOGIN_USERS_TABLE,
  APP_SESSION_COOKIE,
  createPasswordHash,
  signSession,
  verifyPasswordHash,
} from "../api/auth/_utils.js";

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader: vi.fn(function setHeader(name, value) {
      this.headers[name] = value;
    }),
    end: vi.fn(function end(value) {
      this.body = value;
    }),
  };
}

function readResponseBody(res) {
  return JSON.parse(res.body);
}

function createUser(overrides = {}) {
  return {
    user_id: "user-1",
    login_id: "sales01",
    display_name: "Sales User",
    role_code: "sales",
    active: true,
    password_hash: createPasswordHash("secret", {
      iterations: 1,
      salt: "test-salt",
    }),
    ...overrides,
  };
}

function createSupabaseClient(row) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({
      data: row,
      error: null,
    }),
  };

  return {
    query,
    from: vi.fn(() => query),
  };
}

function createPasswordChangeSupabaseClient({ row, updatedRow }) {
  let fromCallCount = 0;
  const findQuery = {
    select: vi.fn(() => findQuery),
    eq: vi.fn(() => findQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: row,
      error: null,
    }),
  };
  const updateQuery = {
    update: vi.fn(() => updateQuery),
    eq: vi.fn(() => updateQuery),
    select: vi.fn(() => updateQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: updatedRow,
      error: null,
    }),
  };

  return {
    findQuery,
    updateQuery,
    from: vi.fn(() => {
      fromCallCount += 1;
      return fromCallCount === 1 ? findQuery : updateQuery;
    }),
  };
}

function createUserAdminListClient({ currentUser, users }) {
  let fromCallCount = 0;
  const currentQuery = {
    select: vi.fn(() => currentQuery),
    eq: vi.fn(() => currentQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: currentUser,
      error: null,
    }),
  };
  const listQuery = {
    select: vi.fn(() => listQuery),
    order: vi.fn().mockResolvedValue({
      data: users,
      error: null,
    }),
  };

  return {
    currentQuery,
    listQuery,
    from: vi.fn(() => {
      fromCallCount += 1;
      return fromCallCount === 1 ? currentQuery : listQuery;
    }),
  };
}

function createUserAdminPatchClient({ currentUser, updatedUser }) {
  let fromCallCount = 0;
  const currentQuery = {
    select: vi.fn(() => currentQuery),
    eq: vi.fn(() => currentQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: currentUser,
      error: null,
    }),
  };
  const updateQuery = {
    update: vi.fn(() => updateQuery),
    eq: vi.fn(() => updateQuery),
    select: vi.fn(() => updateQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: updatedUser,
      error: null,
    }),
  };

  return {
    currentQuery,
    updateQuery,
    from: vi.fn(() => {
      fromCallCount += 1;
      return fromCallCount === 1 ? currentQuery : updateQuery;
    }),
  };
}

function createStandardEffortLastChangeClient({
  currentUser,
  solutionRow = null,
  itemRow = null,
  updaterUser = null,
}) {
  let loginUsersCallCount = 0;
  const currentQuery = {
    select: vi.fn(() => currentQuery),
    eq: vi.fn(() => currentQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: currentUser,
      error: null,
    }),
  };
  const updaterQuery = {
    select: vi.fn(() => updaterQuery),
    eq: vi.fn(() => updaterQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: updaterUser,
      error: null,
    }),
  };
  const solutionQuery = {
    select: vi.fn(() => solutionQuery),
    eq: vi.fn(() => solutionQuery),
    order: vi.fn(() => solutionQuery),
    limit: vi.fn(() => solutionQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: solutionRow,
      error: null,
    }),
  };
  const itemQuery = {
    select: vi.fn(() => itemQuery),
    eq: vi.fn(() => itemQuery),
    order: vi.fn(() => itemQuery),
    limit: vi.fn(() => itemQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: itemRow,
      error: null,
    }),
  };

  return {
    currentQuery,
    updaterQuery,
    solutionQuery,
    itemQuery,
    from: vi.fn((table) => {
      if (table === APP_LOGIN_USERS_TABLE) {
        loginUsersCallCount += 1;
        return loginUsersCallCount === 1 ? currentQuery : updaterQuery;
      }

      if (table === "estimation_project_solution_selection") {
        return solutionQuery;
      }

      if (table === "estimation_project_item_solution_selection") {
        return itemQuery;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

function createSessionCookie(user = createUser()) {
  const sanitizedUser = {
    user_id: user.user_id,
    login_id: user.login_id,
    display_name: user.display_name,
    role_code: user.role_code,
    role_codes: [user.role_code],
  };
  const token = signSession(sanitizedUser);

  return `${APP_SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

describe("app auth Vercel functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_AUTH_SESSION_SECRET =
      "test-session-secret-with-more-than-32-chars";
    process.env.SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NODE_ENV = "test";
    process.env.VERCEL_ENV = "development";
    delete process.env.APP_AUTH_PASSWORD_MIN_LENGTH;
    supabaseMocks.client = createSupabaseClient(null);
  });

  it("rejects missing login_id", async () => {
    const req = {
      method: "POST",
      body: { password: "secret" },
      headers: {},
    };
    const res = createResponse();

    await loginHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects missing password", async () => {
    const req = {
      method: "POST",
      body: { login_id: "sales01" },
      headers: {},
    };
    const res = createResponse();

    await loginHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns the same 401 for inactive or missing users", async () => {
    supabaseMocks.client = createSupabaseClient(null);
    const req = {
      method: "POST",
      body: { login_id: "missing", password: "secret" },
      headers: {},
    };
    const res = createResponse();

    await loginHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 for password mismatch", async () => {
    supabaseMocks.client = createSupabaseClient(createUser());
    const req = {
      method: "POST",
      body: { login_id: "sales01", password: "wrong" },
      headers: {},
    };
    const res = createResponse();

    await loginHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.message).toBe(
      "사용자 ID 또는 비밀번호를 확인하세요."
    );
  });

  it("sets an HttpOnly session cookie and returns a sanitized user", async () => {
    supabaseMocks.client = createSupabaseClient(createUser());
    const req = {
      method: "POST",
      body: { login_id: " Sales01 ", password: "secret" },
      headers: {},
    };
    const res = createResponse();

    await loginHandler(req, res);

    const body = readResponseBody(res);

    expect(res.statusCode).toBe(200);
    expect(supabaseMocks.client.from).toHaveBeenCalledWith(
      APP_LOGIN_USERS_TABLE
    );
    expect(supabaseMocks.client.from).not.toHaveBeenCalledWith("app_users");
    expect(supabaseMocks.client.query.eq).toHaveBeenCalledWith(
      "login_id",
      "sales01"
    );
    expect(supabaseMocks.client.query.eq).toHaveBeenCalledWith("active", true);
    expect(res.headers["Set-Cookie"]).toContain(`${APP_SESSION_COOKIE}=`);
    expect(res.headers["Set-Cookie"]).toContain("HttpOnly");
    expect(body.data.user).toEqual({
      user_id: "user-1",
      login_id: "sales01",
      display_name: "Sales User",
      role_code: "sales",
      role_codes: ["sales"],
    });
    expect(JSON.stringify(body)).not.toContain("password_hash");
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("returns the current user for a valid session cookie", async () => {
    const user = createUser();
    const sanitizedUser = {
      user_id: user.user_id,
      login_id: user.login_id,
      display_name: user.display_name,
      role_code: user.role_code,
      role_codes: [user.role_code],
    };
    const token = signSession(sanitizedUser);
    supabaseMocks.client = createSupabaseClient(user);
    const req = {
      method: "GET",
      headers: {
        cookie: `${APP_SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
    };
    const res = createResponse();

    await sessionHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(supabaseMocks.client.from).toHaveBeenCalledWith(
      APP_LOGIN_USERS_TABLE
    );
    expect(supabaseMocks.client.from).not.toHaveBeenCalledWith("app_users");
    expect(readResponseBody(res).data.user).toEqual(sanitizedUser);
    expect(JSON.stringify(readResponseBody(res))).not.toContain("email");
  });

  it("clears the session cookie on logout", async () => {
    const req = {
      method: "POST",
      headers: {},
    };
    const res = createResponse();

    await logoutHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Set-Cookie"]).toContain(`${APP_SESSION_COOKIE}=`);
    expect(res.headers["Set-Cookie"]).toContain("Max-Age=0");
  });

  it("rejects password change without a session cookie", async () => {
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "new-secret-123",
        new_password_confirm: "new-secret-123",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects password change when the current password is missing", async () => {
    const req = {
      method: "POST",
      body: {
        new_password: "new-secret-123",
        new_password_confirm: "new-secret-123",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects password change when the new password is missing", async () => {
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password_confirm: "new-secret-123",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
  });

  it("uses a 4 character default minimum for password change", async () => {
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "abc",
        new_password_confirm: "abc",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "new_password must be at least 4 characters."
    );
  });

  it("passes password length validation at 4 characters by default", async () => {
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "abcd",
        new_password_confirm: "abcd",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("uses APP_AUTH_PASSWORD_MIN_LENGTH to strengthen the minimum when configured", async () => {
    process.env.APP_AUTH_PASSWORD_MIN_LENGTH = "8";
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "seven77",
        new_password_confirm: "seven77",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "new_password must be at least 8 characters."
    );
  });

  it("passes password length validation with APP_AUTH_PASSWORD_MIN_LENGTH", async () => {
    process.env.APP_AUTH_PASSWORD_MIN_LENGTH = "8";
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "eight888",
        new_password_confirm: "eight888",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("clamps too-low APP_AUTH_PASSWORD_MIN_LENGTH values", async () => {
    process.env.APP_AUTH_PASSWORD_MIN_LENGTH = "2";
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "abc",
        new_password_confirm: "abc",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "new_password must be at least 4 characters."
    );
  });

  it("falls back to the default password minimum for invalid env values", async () => {
    process.env.APP_AUTH_PASSWORD_MIN_LENGTH = "not-a-number";
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "abc",
        new_password_confirm: "abc",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "new_password must be at least 4 characters."
    );
  });

  it("rejects password change when confirmation does not match", async () => {
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "new-secret-123",
        new_password_confirm: "different-secret-123",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects password change when confirmation is missing", async () => {
    const req = {
      method: "POST",
      body: {
        current_password: "current-secret",
        new_password: "new-secret-123",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "new_password_confirm is required."
    );
  });

  it("rejects password change when the new password matches the current password", async () => {
    const req = {
      method: "POST",
      body: {
        current_password: "same-secret",
        new_password: "same-secret",
        new_password_confirm: "same-secret",
      },
      headers: {},
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "new_password must be different from current_password."
    );
  });

  it("returns 401 when the current password is invalid", async () => {
    const user = createUser();
    supabaseMocks.client = createSupabaseClient(user);
    const req = {
      method: "POST",
      body: {
        currentPassword: "wrong-current",
        newPassword: "new-secret-123",
        newPasswordConfirm: "new-secret-123",
      },
      headers: {
        cookie: createSessionCookie(user),
      },
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("updates password_hash and clears the session cookie on password change", async () => {
    const user = createUser({
      password_hash: createPasswordHash("current-secret", {
        iterations: 1,
        salt: "old-salt",
      }),
    });
    const updatedUser = {
      user_id: user.user_id,
      login_id: user.login_id,
      display_name: user.display_name,
      role_code: user.role_code,
      active: true,
    };
    supabaseMocks.client = createPasswordChangeSupabaseClient({
      row: user,
      updatedRow: updatedUser,
    });
    const req = {
      method: "POST",
      body: {
        currentPassword: "current-secret",
        newPassword: "new-secret-123",
        newPasswordConfirm: "new-secret-123",
      },
      headers: {
        cookie: createSessionCookie(user),
      },
    };
    const res = createResponse();

    await changePasswordHandler(req, res);

    const updatePayload =
      supabaseMocks.client.updateQuery.update.mock.calls[0][0];
    const body = readResponseBody(res);

    expect(res.statusCode).toBe(200);
    expect(supabaseMocks.client.from).toHaveBeenCalledWith(
      APP_LOGIN_USERS_TABLE
    );
    expect(supabaseMocks.client.updateQuery.eq).toHaveBeenCalledWith(
      "user_id",
      user.user_id
    );
    expect(supabaseMocks.client.updateQuery.eq).toHaveBeenCalledWith(
      "active",
      true
    );
    expect(updatePayload.password_hash).not.toBe(user.password_hash);
    expect(verifyPasswordHash("new-secret-123", updatePayload.password_hash)).toBe(
      true
    );
    expect(res.headers["Set-Cookie"]).toContain(`${APP_SESSION_COOKIE}=`);
    expect(res.headers["Set-Cookie"]).toContain("Max-Age=0");
    expect(body.data.user).toEqual({
      user_id: "user-1",
      login_id: "sales01",
      display_name: "Sales User",
      role_code: "sales",
      role_codes: ["sales"],
    });
    expect(body.data.reauth_required).toBe(true);
    expect(JSON.stringify(body)).not.toContain("password_hash");
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("rejects user admin list without a session cookie", async () => {
    const req = {
      method: "GET",
      headers: {},
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects user admin list for sales users", async () => {
    const salesUser = createUser({
      user_id: "sales-user",
      role_code: "sales",
    });
    supabaseMocks.client = createUserAdminListClient({
      currentUser: salesUser,
      users: [],
    });
    const req = {
      method: "GET",
      headers: {
        cookie: createSessionCookie(salesUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(readResponseBody(res).error.code).toBe("FORBIDDEN");
  });

  it("rejects user admin list for viewer users", async () => {
    const viewerUser = createUser({
      user_id: "viewer-user",
      role_code: "viewer",
    });
    supabaseMocks.client = createUserAdminListClient({
      currentUser: viewerUser,
      users: [],
    });
    const req = {
      method: "GET",
      headers: {
        cookie: createSessionCookie(viewerUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(readResponseBody(res).error.code).toBe("FORBIDDEN");
  });

  it("returns sanitized app login users for admins", async () => {
    const adminUser = createUser({
      user_id: "admin-user",
      login_id: "admin01",
      role_code: "admin",
    });
    supabaseMocks.client = createUserAdminListClient({
      currentUser: adminUser,
      users: [
        {
          user_id: "target-user",
          login_id: "sales01",
          display_name: "Sales User",
          role_code: "sales",
          active: true,
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-02T00:00:00.000Z",
          password_hash: "should-not-leak",
          email: "should-not-exist@example.com",
        },
      ],
    });
    const req = {
      method: "GET",
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    const body = readResponseBody(res);

    expect(res.statusCode).toBe(200);
    expect(body.data.users).toEqual([
      {
        user_id: "target-user",
        login_id: "sales01",
        display_name: "Sales User",
        role_code: "sales",
        active: true,
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("password_hash");
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("rejects user admin patch for non-admin users", async () => {
    const salesUser = createUser({
      user_id: "sales-user",
      role_code: "sales",
    });
    supabaseMocks.client = createUserAdminPatchClient({
      currentUser: salesUser,
      updatedUser: null,
    });
    const req = {
      method: "PATCH",
      body: {
        user_id: "target-user",
        role_code: "viewer",
      },
      headers: {
        cookie: createSessionCookie(salesUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(readResponseBody(res).error.code).toBe("FORBIDDEN");
  });

  it("rejects invalid user admin role_code updates", async () => {
    const adminUser = createUser({
      user_id: "admin-user",
      role_code: "admin",
    });
    supabaseMocks.client = createUserAdminPatchClient({
      currentUser: adminUser,
      updatedUser: null,
    });
    const req = {
      method: "PATCH",
      body: {
        user_id: "target-user",
        role_code: "owner",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.code).toBe("VALIDATION_ERROR");
    expect(supabaseMocks.client.updateQuery.update).not.toHaveBeenCalled();
  });

  it("updates user role_code and active status as admin", async () => {
    const adminUser = createUser({
      user_id: "admin-user",
      role_code: "admin",
    });
    const updatedUser = {
      user_id: "target-user",
      login_id: "viewer01",
      display_name: "Viewer User",
      role_code: "viewer",
      active: false,
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-03T00:00:00.000Z",
      password_hash: "should-not-leak",
    };
    supabaseMocks.client = createUserAdminPatchClient({
      currentUser: adminUser,
      updatedUser,
    });
    const req = {
      method: "PATCH",
      body: {
        user_id: "target-user",
        role_code: "viewer",
        active: false,
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    const updatePayload =
      supabaseMocks.client.updateQuery.update.mock.calls[0][0];
    const body = readResponseBody(res);

    expect(res.statusCode).toBe(200);
    expect(updatePayload.role_code).toBe("viewer");
    expect(updatePayload.active).toBe(false);
    expect(updatePayload.updated_at).toBeTruthy();
    expect(body.data.user).toEqual({
      user_id: "target-user",
      login_id: "viewer01",
      display_name: "Viewer User",
      role_code: "viewer",
      active: false,
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-03T00:00:00.000Z",
    });
    expect(JSON.stringify(body)).not.toContain("password_hash");
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("rejects self account lock", async () => {
    const adminUser = createUser({
      user_id: "admin-user",
      role_code: "admin",
    });
    supabaseMocks.client = createUserAdminPatchClient({
      currentUser: adminUser,
      updatedUser: null,
    });
    const req = {
      method: "PATCH",
      body: {
        user_id: "admin-user",
        active: false,
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "You cannot lock your own account."
    );
    expect(supabaseMocks.client.updateQuery.update).not.toHaveBeenCalled();
  });

  it("rejects self role_code changes", async () => {
    const adminUser = createUser({
      user_id: "admin-user",
      role_code: "admin",
    });
    supabaseMocks.client = createUserAdminPatchClient({
      currentUser: adminUser,
      updatedUser: null,
    });
    const req = {
      method: "PATCH",
      body: {
        user_id: "admin-user",
        role_code: "sales",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "You cannot change your own role_code."
    );
    expect(supabaseMocks.client.updateQuery.update).not.toHaveBeenCalled();
  });

  it("rejects user admin patch without user_id", async () => {
    const adminUser = createUser({
      user_id: "admin-user",
      role_code: "admin",
    });
    supabaseMocks.client = createUserAdminPatchClient({
      currentUser: adminUser,
      updatedUser: null,
    });
    const req = {
      method: "PATCH",
      body: {
        role_code: "viewer",
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe("user_id is required.");
  });

  it("returns not found for missing user admin patch targets", async () => {
    const adminUser = createUser({
      user_id: "admin-user",
      role_code: "admin",
    });
    supabaseMocks.client = createUserAdminPatchClient({
      currentUser: adminUser,
      updatedUser: null,
    });
    const req = {
      method: "PATCH",
      body: {
        user_id: "missing-user",
        active: true,
      },
      headers: {
        cookie: createSessionCookie(adminUser),
      },
    };
    const res = createResponse();

    await usersHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(readResponseBody(res).error.code).toBe("NOT_FOUND");
  });

  it("rejects standard effort last-change without a session cookie", async () => {
    const req = {
      method: "GET",
      url: "/api/standard-effort/last-change?project_id=7",
      headers: {},
    };
    const res = createResponse();

    await standardEffortLastChangeHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(readResponseBody(res).error.code).toBe("INVALID_CREDENTIALS");
  });

  it("requires project_id for standard effort last-change", async () => {
    const req = {
      method: "GET",
      url: "/api/standard-effort/last-change",
      headers: {},
    };
    const res = createResponse();

    await standardEffortLastChangeHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(readResponseBody(res).error.message).toBe(
      "project_id is required."
    );
  });

  it("returns the latest standard effort last-change with sanitized updater fields", async () => {
    const currentUser = createUser({
      user_id: "viewer-user",
      role_code: "viewer",
    });
    supabaseMocks.client = createStandardEffortLastChangeClient({
      currentUser,
      solutionRow: {
        project_id: 7,
        updated_at: "2026-06-14T08:17:00.000Z",
        updated_by: "admin-user",
      },
      itemRow: {
        project_id: 7,
        updated_at: "2026-06-14T08:18:00.000Z",
        updated_by: "sales-user",
      },
      updaterUser: {
        user_id: "sales-user",
        login_id: "sales01",
        display_name: "영업대표",
        password_hash: "should-not-leak",
        email: "should-not-exist@example.test",
      },
    });
    const req = {
      method: "GET",
      url: "/api/standard-effort/last-change?project_id=7",
      headers: {
        cookie: createSessionCookie(currentUser),
      },
    };
    const res = createResponse();

    await standardEffortLastChangeHandler(req, res);

    const body = readResponseBody(res);

    expect(res.statusCode).toBe(200);
    expect(body.data).toEqual({
      project_id: 7,
      updated_at: "2026-06-14T08:18:00.000Z",
      updated_by: "sales-user",
      updated_by_login_id: "sales01",
      updated_by_display_name: "영업대표",
      source: "project_item_solution_selection",
    });
    expect(supabaseMocks.client.solutionQuery.eq).toHaveBeenCalledWith(
      "project_id",
      "7"
    );
    expect(supabaseMocks.client.itemQuery.eq).toHaveBeenCalledWith(
      "project_id",
      "7"
    );
    expect(JSON.stringify(body)).not.toContain("password_hash");
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("returns an empty standard effort last-change payload when no selection rows exist", async () => {
    const currentUser = createUser({
      user_id: "viewer-user",
      role_code: "viewer",
    });
    supabaseMocks.client = createStandardEffortLastChangeClient({
      currentUser,
    });
    const req = {
      method: "GET",
      url: "/api/standard-effort/last-change?project_id=7",
      headers: {
        cookie: createSessionCookie(currentUser),
      },
    };
    const res = createResponse();

    await standardEffortLastChangeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(readResponseBody(res).data).toEqual({
      project_id: "7",
      updated_at: null,
      updated_by: null,
      updated_by_login_id: null,
      updated_by_display_name: null,
      source: null,
    });
  });
});
