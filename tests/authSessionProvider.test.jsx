// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider, useAuthSession } from "../src/features/auth";

function createSession(loginId = "admin01", roleCode = "admin") {
  return {
    user: {
      user_id: "app-user-1",
      login_id: loginId,
      display_name: "Admin User",
      role_code: roleCode,
      role_codes: [roleCode],
    },
  };
}

function createRepository({ session = null, loadError = null } = {}) {
  const unsubscribe = vi.fn();

  return {
    unsubscribe,
    getAuthSession: vi.fn().mockResolvedValue({
      data: {
        session,
      },
      error: loadError,
    }),
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ data: null, error: null }),
    changePassword: vi.fn().mockResolvedValue({
      data: { reauth_required: true },
      error: null,
    }),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe,
        },
      },
    })),
  };
}

function Reader() {
  const authSession = useAuthSession();

  return (
    <div>
      <div data-testid="mode">{authSession.loginMode}</div>
      <div data-testid="require-login">{String(authSession.requireLogin)}</div>
      <div data-testid="authenticated">
        {String(authSession.isAuthenticated)}
      </div>
      <div data-testid="login-id">{authSession.user?.login_id || ""}</div>
      <div data-testid="display-name">
        {authSession.user?.display_name || ""}
      </div>
      <div data-testid="role-code">{authSession.user?.role_code || ""}</div>
      <div data-testid="user-id">{authSession.user?.user_id || ""}</div>
      <div data-testid="error">{authSession.error?.message || ""}</div>
      <div data-testid="notice">{authSession.notice || ""}</div>
      <button
        type="button"
        onClick={() =>
          authSession.signIn({
            loginId: "sales01",
            password: "secret",
          })
        }
      >
        Sign in
      </button>
      <button type="button" onClick={() => authSession.signOut()}>
        Sign out
      </button>
      <button
        type="button"
        onClick={() =>
          authSession.changePassword({
            currentPassword: "current-secret",
            newPassword: "new-secret-123",
            newPasswordConfirm: "new-secret-123",
          }).catch(() => {})
        }
      >
        Change password
      </button>
    </div>
  );
}

describe("AuthSessionProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps login disabled by default and does not call the repository", () => {
    const repository = createRepository();

    render(
      <AuthSessionProvider env={{}} repository={repository}>
        <Reader />
      </AuthSessionProvider>
    );

    expect(screen.getByTestId("mode").textContent).toBe("disabled");
    expect(screen.getByTestId("require-login").textContent).toBe("false");
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(repository.getAuthSession).not.toHaveBeenCalled();
  });

  it("loads an app auth session and exposes login_id and role_code", async () => {
    const repository = createRepository({
      session: createSession("admin01", "admin"),
    });

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
    expect(screen.getByTestId("login-id").textContent).toBe("admin01");
    expect(screen.getByTestId("display-name").textContent).toBe("Admin User");
    expect(screen.getByTestId("role-code").textContent).toBe("admin");
    expect(screen.getByTestId("user-id").textContent).toBe("app-user-1");
    expect(repository.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("treats deprecated supabase login mode as app mode", async () => {
    const repository = createRepository({
      session: createSession("admin01", "admin"),
    });

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "supabase" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("mode").textContent).toBe("app");
    });
    expect(repository.getAuthSession).toHaveBeenCalledTimes(1);
  });

  it("signs in and updates provider state", async () => {
    const repository = createRepository();
    repository.signIn.mockResolvedValue({
      data: {
        session: createSession("sales01", "sales"),
      },
      error: null,
    });

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(repository.signIn).toHaveBeenCalledWith({
        loginId: "sales01",
        password: "secret",
      })
    );
    await waitFor(() => {
      expect(screen.getByTestId("login-id").textContent).toBe("sales01");
    });
  });

  it("signs out and clears provider state", async () => {
    const repository = createRepository({
      session: createSession("viewer01", "viewer"),
    });

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(repository.signOut).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
    });
  });

  it("changes password, clears provider state, and exposes a re-login notice", async () => {
    const repository = createRepository({
      session: createSession("viewer01", "viewer"),
    });

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() =>
      expect(repository.changePassword).toHaveBeenCalledWith({
        currentPassword: "current-secret",
        newPassword: "new-secret-123",
        newPasswordConfirm: "new-secret-123",
      })
    );
    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
    });
    expect(screen.getByTestId("notice").textContent).toBe(
      "비밀번호가 변경되었습니다. 다시 로그인해 주세요."
    );
  });

  it("keeps the session when password change validation fails", async () => {
    const repository = createRepository({
      session: createSession("viewer01", "viewer"),
    });
    repository.changePassword.mockRejectedValue(
      new Error("new_password must be at least 4 characters.")
    );

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toBe(
        "new_password must be at least 4 characters."
      );
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("login-id").textContent).toBe("viewer01");
    expect(screen.getByTestId("notice").textContent).toBe("");
  });

  it("cleans up auth subscriptions on unmount", async () => {
    const repository = createRepository({
      session: createSession("admin01", "admin"),
    });

    const rendered = render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(repository.onAuthStateChange).toHaveBeenCalledTimes(1);
    });

    rendered.unmount();

    expect(repository.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("surfaces session load errors without requiring a password leak", async () => {
    const repository = createRepository({
      loadError: new Error("session failed"),
    });

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toBe("session failed");
    });
  });
});
