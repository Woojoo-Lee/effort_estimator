// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HeaderBar from "../src/features/layout/components/HeaderBar";

function createHeaderProps(actionPermissions, overrides = {}) {
  return {
    projectMeta: {
      projectId: 123,
      projectName: "Project Alpha",
      savedAt: null,
    },
    status: {
      dbReady: true,
      isBusy: false,
      saveStatus: "idle",
      actionPermissions,
    },
    actions: {
      setProjectName: vi.fn(),
      createNewProject: vi.fn(),
      handleSaveProject: vi.fn(),
      downloadExcel: vi.fn(),
      resetAll: vi.fn(),
      showPrint: vi.fn(),
      openVersionHistory: vi.fn(),
    },
    ...overrides,
  };
}

function renderHeader(actionPermissions, overrides) {
  const props = createHeaderProps(actionPermissions, overrides);

  render(<HeaderBar {...props} />);

  return props;
}

describe("HeaderBar action permissions", () => {
  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("keeps actions enabled when no permission skeleton is provided", () => {
    renderHeader();

    expect(screen.getByDisplayValue("Project Alpha").disabled).toBe(false);
    expect(screen.getByRole("button", { name: "신규" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "저장" }).disabled).toBe(false);
    expect(
      screen.getByRole("button", { name: "Excel 다운로드" }).disabled
    ).toBe(false);
    expect(screen.getByRole("button", { name: "초기화" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "인쇄" }).disabled).toBe(false);
  });

  it("disables project write and export actions without permissions", () => {
    const props = renderHeader({
      canWriteProject: false,
      canExport: false,
      canPrint: false,
      isProjectReadOnly: true,
    });

    expect(screen.getByDisplayValue("Project Alpha").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "신규" }).disabled).toBe(true);
    expect(
      screen.getByRole("button", { name: "버전 보기" }).disabled
    ).toBe(false);
    expect(screen.getByRole("button", { name: "저장" }).disabled).toBe(true);
    expect(
      screen.getByRole("button", { name: "Excel 다운로드" }).disabled
    ).toBe(true);
    expect(screen.getByRole("button", { name: "초기화" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "인쇄" }).disabled).toBe(true);

    screen.getAllByRole("button").forEach((button) => fireEvent.click(button));

    expect(props.actions.createNewProject).not.toHaveBeenCalled();
    expect(props.actions.handleSaveProject).not.toHaveBeenCalled();
    expect(props.actions.downloadExcel).not.toHaveBeenCalled();
    expect(props.actions.resetAll).not.toHaveBeenCalled();
    expect(props.actions.showPrint).not.toHaveBeenCalled();
    expect(props.actions.openVersionHistory).toHaveBeenCalledTimes(1);
  });

  it("allows project save while keeping export disabled when only write permission is present", () => {
    const props = renderHeader({
      canWriteProject: true,
      canExport: false,
      canPrint: false,
      isProjectReadOnly: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    fireEvent.click(screen.getByRole("button", { name: "Excel 다운로드" }));

    expect(props.actions.handleSaveProject).toHaveBeenCalledTimes(1);
    expect(props.actions.downloadExcel).not.toHaveBeenCalled();
  });

  it("keeps new/export actions available but disables current project writes for archived projects", () => {
    const props = renderHeader({
      canWriteProject: true,
      canExport: true,
      canPrint: true,
      isArchivedProject: true,
      isProjectReadOnly: true,
    });

    expect(screen.getByDisplayValue("Project Alpha").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "신규" }).disabled).toBe(false);
    expect(
      screen.getByRole("button", { name: "버전 보기" }).disabled
    ).toBe(false);
    expect(screen.getByRole("button", { name: "저장" }).disabled).toBe(true);
    expect(
      screen.getByRole("button", { name: "Excel 다운로드" }).disabled
    ).toBe(false);
    expect(screen.getByRole("button", { name: "초기화" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "인쇄" }).disabled).toBe(false);

    screen.getAllByRole("button").forEach((button) => fireEvent.click(button));

    expect(props.actions.createNewProject).toHaveBeenCalledTimes(1);
    expect(props.actions.openVersionHistory).toHaveBeenCalledTimes(1);
    expect(props.actions.handleSaveProject).not.toHaveBeenCalled();
    expect(props.actions.downloadExcel).toHaveBeenCalledTimes(1);
    expect(props.actions.resetAll).not.toHaveBeenCalled();
    expect(props.actions.showPrint).toHaveBeenCalledTimes(1);
  });

  it("hides project creation and project save controls in selection-only mode", () => {
    const props = renderHeader(undefined, {
      projectLifecycleEnabled: false,
    });

    expect(screen.queryByDisplayValue("Project Alpha")).toBeNull();
    expect(screen.queryByRole("button", { name: "신규" })).toBeNull();
    expect(screen.queryByRole("button", { name: "저장" })).toBeNull();
    expect(screen.queryByRole("button", { name: "초기화" })).toBeNull();
    expect(screen.getByText("Project Alpha")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "프로젝트 관리" }));
    fireEvent.click(screen.getByRole("button", { name: "Excel 다운로드" }));

    expect(window.location.hash).toBe("#/projects");
    expect(props.actions.createNewProject).not.toHaveBeenCalled();
    expect(props.actions.handleSaveProject).not.toHaveBeenCalled();
    expect(props.actions.downloadExcel).toHaveBeenCalledTimes(1);
  });

  it("keeps account controls out of the estimator header", () => {
    renderHeader();

    expect(screen.queryByTestId("current-auth-user")).toBeNull();
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });
});
