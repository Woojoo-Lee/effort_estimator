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

function createSession(email = "admin@example.com") {
  return {
    access_token: "token",
    user: {
      id: "auth-user-1",
      email,
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
    signInWithPassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      <div data-testid="email">{authSession.user?.email || ""}</div>
      <div data-testid="user-id">{authSession.user?.user_id || ""}</div>
      <div data-testid="error">{authSession.error?.message || ""}</div>
      <button
        type="button"
        onClick={() =>
          authSession.signIn({
            email: "sales@example.com",
            password: "secret",
          })
        }
      >
        Sign in
      </button>
      <button type="button" onClick={() => authSession.signOut()}>
        Sign out
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

  it("loads a Supabase session and exposes email and user_id", async () => {
    const repository = createRepository({
      session: createSession("admin@example.com"),
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
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
    expect(screen.getByTestId("email").textContent).toBe("admin@example.com");
    expect(screen.getByTestId("user-id").textContent).toBe("auth-user-1");
    expect(repository.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("signs in and updates provider state", async () => {
    const repository = createRepository();
    repository.signInWithPassword.mockResolvedValue({
      data: {
        session: createSession("sales@example.com"),
      },
      error: null,
    });

    render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "supabase" }}
        repository={repository}
      >
        <Reader />
      </AuthSessionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(repository.signInWithPassword).toHaveBeenCalledWith({
        email: "sales@example.com",
        password: "secret",
      })
    );
    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("sales@example.com");
    });
  });

  it("signs out and clears provider state", async () => {
    const repository = createRepository({
      session: createSession("viewer@example.com"),
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

  it("cleans up auth subscriptions on unmount", async () => {
    const repository = createRepository({
      session: createSession("admin@example.com"),
    });

    const rendered = render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "supabase" }}
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
        env={{ VITE_AUTH_LOGIN_MODE: "supabase" }}
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
