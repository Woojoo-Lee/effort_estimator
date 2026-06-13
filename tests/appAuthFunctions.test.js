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
import {
  APP_LOGIN_USERS_TABLE,
  APP_SESSION_COOKIE,
  createPasswordHash,
  signSession,
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

describe("app auth Vercel functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_AUTH_SESSION_SECRET =
      "test-session-secret-with-more-than-32-chars";
    process.env.SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NODE_ENV = "test";
    process.env.VERCEL_ENV = "development";
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
});
