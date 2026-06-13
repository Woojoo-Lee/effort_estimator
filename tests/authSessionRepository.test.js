import { describe, expect, it, vi } from "vitest";

import {
  getAuthSession,
  getCurrentAuthUser,
  onAuthStateChange,
  signIn,
  signInWithPassword,
  signOut,
} from "../src/features/auth";

function createResponse(body, { status = 200, ok = true } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function createUser(overrides = {}) {
  return {
    user_id: "user-1",
    login_id: "sales01",
    display_name: "Sales User",
    role_code: "sales",
    role_codes: ["sales"],
    ...overrides,
  };
}

describe("authSessionRepository", () => {
  it("calls the app session endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse({
        ok: true,
        data: { user: createUser() },
      })
    );

    const result = await getAuthSession(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
    expect(result.data.user).toEqual(createUser());
  });

  it("returns a null session for 401 session responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse(
        {
          ok: false,
          error: { code: "INVALID_CREDENTIALS" },
        },
        { status: 401, ok: false }
      )
    );

    await expect(getAuthSession(fetchImpl)).resolves.toEqual({
      data: {
        session: null,
        user: null,
      },
      error: null,
    });
  });

  it("calls the app current user path through session lookup", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse({
        ok: true,
        data: { user: createUser({ login_id: "admin01" }) },
      })
    );

    const result = await getCurrentAuthUser(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.data.user.login_id).toBe("admin01");
  });

  it("calls app login with login_id and password without logging", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse({
        ok: true,
        data: { user: createUser() },
      })
    );
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await signIn(
      {
        loginId: " Sales01 ",
        password: "secret-password",
      },
      fetchImpl
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          login_id: "sales01",
          password: "secret-password",
        }),
      })
    );
    expect(consoleLog).not.toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  it("keeps signInWithPassword as a deprecated app-login alias", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse({
        ok: true,
        data: { user: createUser() },
      })
    );

    await signInWithPassword(
      {
        login_id: "viewer01",
        password: "secret",
      },
      fetchImpl
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        body: JSON.stringify({
          login_id: "viewer01",
          password: "secret",
        }),
      })
    );
  });

  it("calls app logout", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse({
        ok: true,
        data: {},
      })
    );

    await signOut(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
  });

  it("exposes a no-op auth state change subscription", () => {
    const unsubscribe = onAuthStateChange();

    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});
