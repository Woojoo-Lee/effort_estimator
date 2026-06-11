import { describe, expect, it, vi } from "vitest";

import {
  getAuthSession,
  getCurrentAuthUser,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "../src/features/auth";

function createAuthClient() {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: { session: null, user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(),
    },
  };
}

describe("authSessionRepository", () => {
  it("calls supabase auth getSession", async () => {
    const client = createAuthClient();

    await getAuthSession(client);

    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it("calls supabase auth getUser", async () => {
    const client = createAuthClient();

    await getCurrentAuthUser(client);

    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it("calls signInWithPassword with email and password without logging", async () => {
    const client = createAuthClient();
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await signInWithPassword(
      {
        email: "sales@example.com",
        password: "secret-password",
      },
      client
    );

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "sales@example.com",
      password: "secret-password",
    });
    expect(consoleLog).not.toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  it("calls supabase auth signOut", async () => {
    const client = createAuthClient();

    await signOut(client);

    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("registers auth state changes and normalizes callback payload", () => {
    const client = createAuthClient();
    const callback = vi.fn();
    const session = {
      access_token: "token",
      user: {
        id: "auth-user-1",
        email: "admin@example.com",
      },
    };

    client.auth.onAuthStateChange.mockImplementation((handler) => {
      handler("SIGNED_IN", session);
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    onAuthStateChange(callback, client);

    expect(client.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({
      event: "SIGNED_IN",
      session,
      user: session.user,
    });
  });
});
