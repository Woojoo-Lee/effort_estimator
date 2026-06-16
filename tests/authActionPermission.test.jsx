// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HeaderBar from "../src/features/layout/components/HeaderBar";

function createHeaderProps(actionPermissions) {
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
  };
}

function renderHeader(actionPermissions) {
  const props = createHeaderProps(actionPermissions);

  render(<HeaderBar {...props} />);

  return props;
}

describe("HeaderBar action permissions", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps actions enabled when no permission skeleton is provided", () => {
    renderHeader();

    const buttons = screen.getAllByRole("button");

    expect(screen.getByDisplayValue("Project Alpha").disabled).toBe(false);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[2].disabled).toBe(false);
    expect(buttons[3].disabled).toBe(false);
    expect(buttons[4].disabled).toBe(false);
    expect(buttons[5].disabled).toBe(false);
  });

  it("disables project write and export actions without permissions", () => {
    const props = renderHeader({
      canWriteProject: false,
      canExport: false,
      canPrint: false,
      isProjectReadOnly: true,
    });

    const buttons = screen.getAllByRole("button");

    expect(screen.getByDisplayValue("Project Alpha").disabled).toBe(true);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);
    expect(buttons[2].disabled).toBe(true);
    expect(buttons[3].disabled).toBe(true);
    expect(buttons[4].disabled).toBe(true);
    expect(buttons[5].disabled).toBe(true);

    buttons.forEach((button) => fireEvent.click(button));

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

    const buttons = screen.getAllByRole("button");

    expect(buttons[2].disabled).toBe(false);
    expect(buttons[3].disabled).toBe(true);
    expect(buttons[5].disabled).toBe(true);

    fireEvent.click(buttons[2]);
    fireEvent.click(buttons[3]);

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

    const buttons = screen.getAllByRole("button");

    expect(screen.getByDisplayValue("Project Alpha").disabled).toBe(true);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(false);
    expect(buttons[2].disabled).toBe(true);
    expect(buttons[3].disabled).toBe(false);
    expect(buttons[4].disabled).toBe(true);
    expect(buttons[5].disabled).toBe(false);

    buttons.forEach((button) => fireEvent.click(button));

    expect(props.actions.createNewProject).toHaveBeenCalledTimes(1);
    expect(props.actions.openVersionHistory).toHaveBeenCalledTimes(1);
    expect(props.actions.handleSaveProject).not.toHaveBeenCalled();
    expect(props.actions.downloadExcel).toHaveBeenCalledTimes(1);
    expect(props.actions.resetAll).not.toHaveBeenCalled();
    expect(props.actions.showPrint).toHaveBeenCalledTimes(1);
  });

  it("keeps account controls out of the estimator header", () => {
    renderHeader();

    expect(screen.queryByTestId("current-auth-user")).toBeNull();
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });
});
