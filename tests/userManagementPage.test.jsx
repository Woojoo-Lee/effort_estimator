// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AuthSessionProvider,
  UserManagementPage,
} from "../src/features/auth";

function createSessionRepository() {
  return {
    getAuthSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            user_id: "admin-user",
            login_id: "admin01",
            display_name: "관리자",
            role_code: "admin",
            role_codes: ["admin"],
          },
        },
      },
      error: null,
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    changePassword: vi.fn(),
    onAuthStateChange: vi.fn(() => ({})),
  };
}

function createUsers() {
  return [
    {
      user_id: "admin-user",
      login_id: "admin01",
      display_name: "관리자",
      role_code: "admin",
      active: true,
      updated_at: "2026-06-01T00:00:00.000Z",
      password_hash: "should-not-render",
      email: "should-not-render@example.com",
    },
    {
      user_id: "sales-user",
      login_id: "sales01",
      display_name: "영업대표",
      role_code: "sales",
      active: true,
      updated_at: "2026-06-02T00:00:00.000Z",
    },
    {
      user_id: "viewer-user",
      login_id: "viewer01",
      display_name: "조회자",
      role_code: "viewer",
      active: false,
      updated_at: "2026-06-03T00:00:00.000Z",
    },
  ];
}

function createUserRepository(overrides = {}) {
  return {
    fetchAuthUsers: vi.fn().mockResolvedValue({
      users: createUsers(),
    }),
    updateAuthUser: vi.fn(async (payload) => ({
      user: {
        user_id: payload.userId,
        login_id: payload.userId === "sales-user" ? "sales01" : "viewer01",
        display_name: payload.displayName || "Updated User",
        role_code: payload.roleCode || "viewer",
        active: payload.active,
        updated_at: "2026-06-04T00:00:00.000Z",
      },
    })),
    ...overrides,
  };
}

function renderPage({ userRepository = createUserRepository() } = {}) {
  return {
    userRepository,
    ...render(
      <AuthSessionProvider
        env={{ VITE_AUTH_LOGIN_MODE: "app" }}
        repository={createSessionRepository()}
      >
        <UserManagementPage repository={userRepository} />
      </AuthSessionProvider>
    ),
  };
}

function getRowByLoginId(loginId) {
  return screen.getByText(loginId).closest("tr");
}

describe("UserManagementPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders app login users without password_hash or email", async () => {
    renderPage();

    expect(await screen.findByText("사용자 관리")).toBeTruthy();
    expect(screen.getByText("admin01")).toBeTruthy();
    expect(screen.getByText("sales01")).toBeTruthy();
    expect(screen.getByText("viewer01")).toBeTruthy();
    expect(within(getRowByLoginId("admin01")).getByLabelText("admin01 표시명").value).toBe("관리자");
    expect(within(getRowByLoginId("sales01")).getByLabelText("sales01 표시명").value).toBe("영업대표");
    expect(screen.queryByText(/password_hash/i)).toBeNull();
    expect(screen.queryByText(/email/i)).toBeNull();
    expect(screen.queryByText("should-not-render")).toBeNull();
  });

  it("enables row save when role changes and calls the repository", async () => {
    const userRepository = createUserRepository();
    renderPage({ userRepository });

    const row = await waitFor(() => getRowByLoginId("sales01"));
    const roleSelect = within(row).getByLabelText("sales01 역할");

    fireEvent.change(roleSelect, { target: { value: "viewer" } });

    const saveButton = within(row).getByRole("button", { name: "저장" });
    expect(saveButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userRepository.updateAuthUser).toHaveBeenCalledWith({
        userId: "sales-user",
        displayName: "영업대표",
        roleCode: "viewer",
        active: true,
      });
    });
  });

  it("enables row save when active status changes", async () => {
    const userRepository = createUserRepository();
    renderPage({ userRepository });

    const row = await waitFor(() => getRowByLoginId("viewer01"));
    const activeSelect = within(row).getByLabelText("viewer01 상태");

    fireEvent.change(activeSelect, { target: { value: "active" } });
    fireEvent.click(within(row).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(userRepository.updateAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "viewer-user",
          active: true,
        })
      );
    });
  });

  it("displays save errors", async () => {
    const userRepository = createUserRepository({
      updateAuthUser: vi.fn().mockRejectedValue(new Error("save failed")),
    });
    renderPage({ userRepository });

    const row = await waitFor(() => getRowByLoginId("sales01"));

    fireEvent.change(within(row).getByLabelText("sales01 역할"), {
      target: { value: "viewer" },
    });
    fireEvent.click(within(row).getByRole("button", { name: "저장" }));

    expect(await within(row).findByText("save failed")).toBeTruthy();
  });

  it("prevents self role and active edits in the UI", async () => {
    renderPage();

    const row = await waitFor(() => getRowByLoginId("admin01"));

    expect(within(row).getByLabelText("admin01 역할").disabled).toBe(true);
    expect(within(row).getByLabelText("admin01 상태").disabled).toBe(true);
    expect(within(row).getByText("본인 역할 변경 불가")).toBeTruthy();
    expect(within(row).getByText("본인 잠금 불가")).toBeTruthy();
  });
});
