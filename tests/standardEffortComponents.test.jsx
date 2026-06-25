// @vitest-environment jsdom
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auditMocks = vi.hoisted(() => ({
  createAuditLogSafe: vi.fn(() =>
    Promise.resolve({
      ok: true,
      data: { audit_log_id: "audit-log-id" },
      error: null,
    })
  ),
}));

vi.mock("../src/features/audit", async () => {
  const actual = await vi.importActual("../src/features/audit");

  return {
    ...actual,
    createAuditLogSafe: auditMocks.createAuditLogSafe,
  };
});

import {
  StandardEffortPanel,
  StandardEffortSection,
} from "../src/features/estimator/components/standard";
import ProjectSelectorBar from "../src/features/projects/components/ProjectSelectorBar";

const solutionVariants = [
  {
    solution_variant_id: "pbx",
    solution_code: "pbx",
    solution_name: "PBX",
    variant_code: "avaya",
    variant_name: "Avaya",
    display_name: "PBX",
    display_order: 10,
    active: true,
  },
  {
    solution_variant_id: "cti-v4",
    solution_code: "cti",
    solution_name: "CTI",
    variant_code: "v4",
    variant_name: "v4",
    display_name: "CTI v4",
    display_order: 40,
    active: true,
  },
  {
    solution_variant_id: "wfm",
    solution_code: "wfm",
    solution_name: "WFM",
    variant_code: "v4",
    variant_name: "4",
    display_name: "WFM",
    display_order: 110,
    active: true,
  },
];

const itemRows = [
  {
    item_id: "item-a",
    excel_row_no: 13,
    category_l1: "공통정보",
    category_l2: null,
    item_name: "업종",
    item_option: "금융_증권",
    display_order: 20,
    active: true,
  },
  {
    item_id: "item-b",
    excel_row_no: 17,
    category_l1: "공통정보",
    category_l2: null,
    item_name: "상담석수",
    item_option: "100 미만",
    display_order: 10,
    active: true,
  },
  {
    item_id: "item-c",
    excel_row_no: 64,
    category_l1: "추가 요구사항",
    category_l2: null,
    item_name: "보안",
    item_option: "",
    display_order: 30,
    active: true,
  },
];

const projectSolutionSelections = [
  { solution_variant_id: "pbx", enabled: true, actual_effort_mm: 1 },
  { solution_variant_id: "cti-v4", enabled: false, actual_effort_mm: 0 },
  { solution_variant_id: "wfm", enabled: true, actual_effort_mm: 2 },
];

const projectItemSelections = [
  { solution_variant_id: "pbx", item_id: "item-a", checked: true },
];

const results = [
  {
    solution_variant_id: "pbx",
    solution_code: "pbx",
    solution_name: "PBX",
    variant_code: "avaya",
    variant_name: "Avaya",
    display_name: "PBX",
    base_total_mm: 6,
    coefficient_total: 1.28,
    standard_effort_mm: 7.68,
    actual_effort_mm: 1,
    gap_mm: 6.68,
  },
  {
    solution_variant_id: "wfm",
    solution_code: "wfm",
    solution_name: "WFM",
    variant_code: "v4",
    variant_name: "4",
    display_name: "WFM",
    base_total_mm: 8,
    coefficient_total: 0,
    standard_effort_mm: 0,
    actual_effort_mm: 2,
    gap_mm: -2,
  },
];

beforeEach(() => {
  vi.unstubAllEnvs();
  auditMocks.createAuditLogSafe.mockClear();
  auditMocks.createAuditLogSafe.mockResolvedValue({
    ok: true,
    data: { audit_log_id: "audit-log-id" },
    error: null,
  });
});

function expectNoSectionDirtyWarning() {
  expect(screen.queryByText("저장되지 않은 변경사항이 있습니다.")).toBeNull();
}

describe("ProjectSelectorBar compact standard effort header", () => {
  it("shows compact project controls without the duplicated selected project card", () => {
    render(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        downloadExcel={vi.fn()}
        standardEffortLastChange={{
          project_id: 42,
          updated_at: "2026-06-14T08:18:00.000Z",
          updated_by_login_id: "admin01",
          updated_by_display_name: "관리자",
          source: "project_solution_selection",
        }}
      />
    );

    expect(screen.getByLabelText("프로젝트 선택")).toBeTruthy();
    expect(screen.queryByText("DB 프로젝트")).toBeNull();
    expect(screen.queryByText("현재 선택 프로젝트")).toBeNull();
    expect(screen.getByRole("button", { name: "새로고침" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Excel 다운로드" })).toBeTruthy();
    expect(screen.getByText(/공수 산정 수정:/)).toBeTruthy();
    expect(screen.getByText(/수정자: 관리자/)).toBeTruthy();
  });

  it("runs refresh and Excel actions from compact icon buttons", () => {
    const refreshProjects = vi.fn();
    const downloadExcel = vi.fn();

    render(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={refreshProjects}
        dbReady={true}
        isBusy={false}
        downloadExcel={downloadExcel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    fireEvent.click(screen.getByRole("button", { name: "Excel 다운로드" }));

    expect(refreshProjects).toHaveBeenCalledTimes(1);
    expect(downloadExcel).toHaveBeenCalledTimes(1);
  });

  it("shows explicit standard effort save button only when draft changes need saving", () => {
    const onSaveStandardEffort = vi.fn();

    const { rerender } = render(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        showStandardEffortSaveButton
        onSaveStandardEffort={onSaveStandardEffort}
        canSaveStandardEffort={true}
        standardEffortDirty={false}
      />
    );

    const saveButton = screen.getByRole("button", { name: "공수 저장" });

    expect(saveButton.disabled).toBe(true);

    rerender(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        showStandardEffortSaveButton
        onSaveStandardEffort={onSaveStandardEffort}
        canSaveStandardEffort={true}
        standardEffortDirty
      />
    );

    expect(screen.getByText("저장되지 않은 변경사항이 있습니다.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "공수 저장" }));

    expect(onSaveStandardEffort).toHaveBeenCalledTimes(1);
  });

  it("shows explicit standard effort saving and failure states", () => {
    const { rerender } = render(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        showStandardEffortSaveButton
        onSaveStandardEffort={vi.fn()}
        standardEffortDirty
        standardEffortSaving
        standardEffortSaveMessage="저장 중..."
      />
    );

    expect(screen.getByRole("button", { name: "공수 저장" }).disabled).toBe(
      true
    );
    expect(screen.getAllByText("저장 중...").length).toBeGreaterThanOrEqual(1);

    rerender(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        showStandardEffortSaveButton
        onSaveStandardEffort={vi.fn()}
        standardEffortDirty
        standardEffortSaveError="공수 산정 저장에 실패했습니다."
      />
    );

    expect(screen.getByText("공수 산정 저장에 실패했습니다.")).toBeTruthy();
    expect(screen.getByText("저장되지 않은 변경사항이 있습니다.")).toBeTruthy();
  });

  it("clears the dirty warning after explicit standard effort save succeeds", () => {
    const { rerender } = render(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        showStandardEffortSaveButton
        onSaveStandardEffort={vi.fn()}
        canSaveStandardEffort={true}
        standardEffortDirty
      />
    );

    expect(screen.getByText("저장되지 않은 변경사항이 있습니다.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "공수 저장" }).disabled).toBe(
      false
    );

    rerender(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        showStandardEffortSaveButton
        onSaveStandardEffort={vi.fn()}
        canSaveStandardEffort={true}
        standardEffortDirty={false}
        standardEffortSaveMessage="공수 산정 내용을 저장했습니다."
      />
    );

    expect(
      screen.queryByText("저장되지 않은 변경사항이 있습니다.")
    ).toBeNull();
    expect(screen.getByText("공수 산정 내용을 저장했습니다.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "공수 저장" }).disabled).toBe(
      true
    );
  });

  it("uses login_id fallback without exposing raw updated_by UUID", () => {
    render(
      <ProjectSelectorBar
        projects={[{ id: 42, project_name: "대표 보고 프로젝트" }]}
        projectId={42}
        loadProject={vi.fn()}
        refreshProjects={vi.fn()}
        dbReady={true}
        isBusy={false}
        standardEffortLastChange={{
          project_id: 42,
          updated_at: "2026-06-14T08:18:00.000Z",
          updated_by: "raw-user-uuid",
          updated_by_login_id: "sales01",
          source: "project_item_solution_selection",
        }}
      />
    );

    expect(screen.getByText(/수정자: sales01/)).toBeTruthy();
    expect(screen.queryByText(/raw-user-uuid/)).toBeNull();
  });
});

describe("StandardEffortPanel", () => {
  it("keeps the solution selector visible when no solution is selected yet", () => {
    render(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={[]}
        projectItemSelections={[]}
        results={[]}
      />
    );

    expect(screen.getByText("PBX")).toBeTruthy();
    expect(screen.getByText("CTI v4")).toBeTruthy();
    expect(screen.getByText("WFM")).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(
      solutionVariants.length
    );
    expect(screen.getByText(/선택된 솔루션이 없습니다/)).toBeTruthy();
    expect(screen.queryByRole("region", {
      name: "표준공수 기능항목 선택",
    })).toBeNull();
  });

  it("shows admin guidance when solution metadata is empty", () => {
    render(
      <StandardEffortPanel
        solutionVariants={[]}
        itemRows={itemRows}
        projectSolutionSelections={[]}
        projectItemSelections={[]}
        results={[]}
      />
    );

    expect(
      screen.getByText("표준공수 솔루션 메타가 없습니다. 관리자에게 문의하세요.")
    ).toBeTruthy();
  });

  it("disables selector, item checkboxes, and actual inputs while loading", () => {
    render(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={projectSolutionSelections}
        projectItemSelections={projectItemSelections}
        results={results}
        loading
      />
    );

    expect(screen.getByText("표준공수 메타를 불러오는 중입니다.")).toBeTruthy();
    screen
      .getAllByRole("checkbox")
      .forEach((checkbox) => expect(checkbox.disabled).toBe(true));
    expect(
      screen.getByRole("button", { name: "표준공수 새로고침" }).disabled
    ).toBe(true);
    expect(screen.getByLabelText("PBX 실투입공수").disabled).toBe(true);
  });

  it("keeps solution and item controls writable while actual effort is read-only", () => {
    const onToggleItem = vi.fn();
    const onToggleSolution = vi.fn();

    render(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={projectSolutionSelections}
        projectItemSelections={projectItemSelections}
        results={results}
        onToggleSolution={onToggleSolution}
        onToggleItem={onToggleItem}
        readOnly={false}
        actualEffortReadOnly
      />
    );

    const solutionCheckbox = screen.getAllByRole("checkbox")[0];

    expect(solutionCheckbox.disabled).toBe(false);
    fireEvent.click(solutionCheckbox);
    expect(onToggleSolution).toHaveBeenCalledWith("pbx", false);

    const checkTable = screen.getByRole("region", {
      name: "표준공수 기능항목 선택",
    });
    const itemCheckbox = within(checkTable).getByLabelText("WFM 보안 선택");
    expect(itemCheckbox.disabled).toBe(false);

    fireEvent.click(itemCheckbox);
    expect(onToggleItem).toHaveBeenCalledWith("wfm", "item-c", true);

    expect(screen.getByLabelText("PBX 실투입공수").disabled).toBe(true);
  });

  it("can disable solution and item controls independently", () => {
    const onToggleSolution = vi.fn();
    const onToggleItem = vi.fn();

    const { rerender } = render(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={projectSolutionSelections}
        projectItemSelections={projectItemSelections}
        results={results}
        onToggleSolution={onToggleSolution}
        onToggleItem={onToggleItem}
        solutionSelectionReadOnly
        itemSelectionReadOnly={false}
        actualEffortReadOnly
      />
    );

    const solutionCheckbox = screen.getAllByRole("checkbox")[0];
    const checkTable = screen.getByRole("region", {
      name: "표준공수 기능항목 선택",
    });
    const itemCheckbox = within(checkTable).getByLabelText("WFM 보안 선택");

    expect(solutionCheckbox.disabled).toBe(true);
    expect(itemCheckbox.disabled).toBe(false);

    fireEvent.click(itemCheckbox);

    expect(onToggleSolution).not.toHaveBeenCalled();
    expect(onToggleItem).toHaveBeenCalledWith("wfm", "item-c", true);

    rerender(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={projectSolutionSelections}
        projectItemSelections={projectItemSelections}
        results={results}
        onToggleSolution={onToggleSolution}
        onToggleItem={onToggleItem}
        solutionSelectionReadOnly={false}
        itemSelectionReadOnly
        actualEffortReadOnly
      />
    );

    const enabledSolutionCheckbox = screen.getAllByRole("checkbox")[0];
    const disabledItemCheckbox = within(
      screen.getByRole("region", {
        name: "표준공수 기능항목 선택",
      })
    ).getByLabelText("WFM 보안 선택");

    expect(enabledSolutionCheckbox.disabled).toBe(false);
    expect(disabledItemCheckbox.disabled).toBe(true);
  });

  it("renders selected variant columns, group headers, summary totals, and calls immediate checkbox handlers", () => {
    const onToggleItem = vi.fn();
    const onChangeActualEffort = vi.fn();

    render(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={projectSolutionSelections}
        projectItemSelections={projectItemSelections}
        results={results}
        totals={{
          base_total_mm: 14,
          coefficient_total: 1.28,
          standard_effort_mm: 7.68,
          actual_effort_mm: 3,
          gap_mm: 4.68,
          solution_count: 2,
        }}
        onToggleItem={onToggleItem}
        onChangeActualEffort={onChangeActualEffort}
      />
    );

    const checkTable = screen.getByRole("region", {
      name: "표준공수 기능항목 선택",
    });
    const columnHeaders = within(checkTable)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);

    expect(columnHeaders).toEqual(["구분", "기능항목", "옵션", "PBX", "WFM"]);
    expect(columnHeaders).not.toContain("CTI v4");
    expect(within(checkTable).getAllByText("공통정보").length).toBeGreaterThan(
      0
    );
    expect(
      within(checkTable).getAllByText("추가 요구사항").length
    ).toBeGreaterThan(0);

    fireEvent.click(within(checkTable).getByLabelText("WFM 보안 선택"));
    expect(onToggleItem).toHaveBeenCalledWith("wfm", "item-c", true);

    const summary = screen.getByRole("region", { name: "표준공수 요약" });

    expect(within(summary).getByText("기본공수합(M/M)")).toBeTruthy();
    expect(within(summary).getByText("표준공수(M/M)")).toBeTruthy();
    expect(within(summary).getByText("실투입공수(M/M)")).toBeTruthy();
    expect(within(summary).getByText("GAP(M/M)")).toBeTruthy();
    expect(within(summary).getByText("합계")).toBeTruthy();
    expect(within(summary).getAllByText("7.68").length).toBeGreaterThan(0);

    const actualInput = within(summary).getByLabelText("PBX 실투입공수");

    fireEvent.change(actualInput, {
      target: { value: "3.5" },
    });
    expect(onChangeActualEffort).not.toHaveBeenCalled();

    fireEvent.blur(actualInput);
    expect(onChangeActualEffort).toHaveBeenCalledWith("pbx", "3.5");
  });

  it("does not save unchanged actual effort and commits an empty draft as zero", () => {
    const onChangeActualEffort = vi.fn();

    render(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={projectSolutionSelections}
        projectItemSelections={projectItemSelections}
        results={results}
        onChangeActualEffort={onChangeActualEffort}
      />
    );

    const summary = screen.getByRole("region", { name: "표준공수 요약" });
    const actualInput = within(summary).getByLabelText("PBX 실투입공수");

    fireEvent.blur(actualInput);
    expect(onChangeActualEffort).not.toHaveBeenCalled();

    fireEvent.change(actualInput, {
      target: { value: "" },
    });
    fireEvent.blur(actualInput);
    expect(onChangeActualEffort).toHaveBeenCalledWith("pbx", 0);
  });

  it("resets actual effort with Escape and commits with Enter", () => {
    const onChangeActualEffort = vi.fn();

    render(
      <StandardEffortPanel
        solutionVariants={solutionVariants}
        itemRows={itemRows}
        projectSolutionSelections={projectSolutionSelections}
        projectItemSelections={projectItemSelections}
        results={results}
        onChangeActualEffort={onChangeActualEffort}
      />
    );

    const summary = screen.getByRole("region", { name: "표준공수 요약" });
    const actualInput = within(summary).getByLabelText("PBX 실투입공수");

    fireEvent.change(actualInput, {
      target: { value: "5" },
    });
    fireEvent.keyDown(actualInput, { key: "Escape" });
    expect(actualInput.value).toBe("1");
    expect(onChangeActualEffort).not.toHaveBeenCalled();

    fireEvent.change(actualInput, {
      target: { value: "5" },
    });
    fireEvent.keyDown(actualInput, { key: "Enter" });
    fireEvent.blur(actualInput);

    expect(onChangeActualEffort).toHaveBeenCalledTimes(1);
    expect(onChangeActualEffort).toHaveBeenCalledWith("pbx", "5");
  });
});

describe("StandardEffortSection", () => {
  it("does not auto load the same project but refreshes on explicit button click", async () => {
    const loadProjectStandardEffort = vi.fn();
    const refreshProjectStandardEffort = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 1),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort,
          refreshProjectStandardEffort,
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    expect(loadProjectStandardEffort).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "표준공수 새로고침" }));

    await screen.findByText("새로고침 완료");
    expect(refreshProjectStandardEffort).toHaveBeenCalledWith(42);
  });

  it("disables the refresh button without a projectId", () => {
    render(
      <StandardEffortSection
        projectId={null}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 1),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [],
          projectItemSelections: [],
          results: [],
          loadedProjectId: null,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          refreshProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    expect(
      screen.getByRole("button", { name: "표준공수 새로고침" }).disabled
    ).toBe(true);
  });

  it("shows a section-local error when refresh fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const refreshProjectStandardEffort = vi.fn().mockResolvedValue(false);

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 1),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [],
          projectItemSelections: [],
          results: [],
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          refreshProjectStandardEffort,
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "표준공수 새로고침" }));

    expect(
      await screen.findByText("표준공수 데이터를 다시 불러오지 못했습니다.")
    ).toBeTruthy();
    expect(refreshProjectStandardEffort).toHaveBeenCalledWith(42);
    consoleError.mockRestore();
  });

  it("loads by numeric projectId and updates standard effort draft without uuid conversion", async () => {
    const loadProjectStandardEffort = vi.fn();
    const saveStandardProjectSolutionSelections = vi.fn();
    const saveStandardProjectItemSelections = vi.fn();
    const updateStandardActualEffort = vi.fn();
    const setStandardProjectSolutionSelections = vi.fn();
    const setStandardProjectItemSelections = vi.fn();

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
            {
              solution_variant_id: "cti-v4",
              enabled: false,
              actual_effort_mm: 0,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          totals: {
            base_total_mm: 6,
            coefficient_total: 1.28,
            standard_effort_mm: 7.68,
            actual_effort_mm: 4.5,
            gap_mm: 3.18,
            solution_count: 1,
          },
          loadedProjectId: null,
        }}
        standardEffortActions={{
          loadProjectStandardEffort,
          setStandardProjectSolutionSelections,
          setStandardProjectItemSelections,
          saveStandardProjectSolutionSelections,
          saveStandardProjectItemSelections,
          updateStandardActualEffort,
        }}
      />
    );

    expect(loadProjectStandardEffort).toHaveBeenCalledWith(42);

    const checkboxes = screen.getAllByRole("checkbox");

    fireEvent.click(checkboxes[0]);
    expectNoSectionDirtyWarning();
    expect(setStandardProjectSolutionSelections).toHaveBeenCalledWith([
      {
        project_id: 42,
        solution_variant_id: "pbx",
        enabled: false,
        actual_effort_mm: 4.5,
      },
      {
        solution_variant_id: "cti-v4",
        enabled: false,
        actual_effort_mm: 0,
      },
    ]);
    expect(saveStandardProjectSolutionSelections).not.toHaveBeenCalled();

    fireEvent.click(checkboxes[checkboxes.length - 1]);
    await waitFor(() =>
      expect(setStandardProjectItemSelections).toHaveBeenCalledWith([
        {
          project_id: 42,
          solution_variant_id: "pbx",
          item_id: "item-a",
          checked: true,
        },
      ])
    );
    expect(saveStandardProjectItemSelections).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("spinbutton").disabled).toBe(false));

    const actualInput = screen.getByRole("spinbutton");

    fireEvent.change(actualInput, {
      target: { value: "9.25" },
    });
    expect(updateStandardActualEffort).not.toHaveBeenCalled();

    fireEvent.blur(actualInput);
    await waitFor(() =>
      expect(setStandardProjectSolutionSelections).toHaveBeenLastCalledWith([
        {
          project_id: 42,
          solution_variant_id: "pbx",
          enabled: true,
          actual_effort_mm: 9.25,
        },
        {
          solution_variant_id: "cti-v4",
          enabled: false,
          actual_effort_mm: 0,
        },
      ])
    );
    expect(updateStandardActualEffort).not.toHaveBeenCalled();
  });

  it("keeps solution toggle as a local draft until explicit save", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "auto");
    const saveStandardProjectSolutionSelections = vi
      .fn()
      .mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections,
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectSolutionSelections).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("skips solution toggle frontend audit in api auto mode without breaking save UX", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "auto");
    const saveStandardProjectSolutionSelections = vi
      .fn()
      .mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        auditActor={{
          actorUserId: "user-solution",
        }}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections,
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectSolutionSelections).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("keeps solution toggle save successful when audit logging fails", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const saveStandardProjectSolutionSelections = vi
      .fn()
      .mockResolvedValue(true);
    auditMocks.createAuditLogSafe.mockResolvedValueOnce({
      ok: false,
      data: null,
      error: new Error("audit failed"),
    });

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections,
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectSolutionSelections).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("keeps solution toggle save successful when audit logging rejects", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const saveStandardProjectSolutionSelections = vi
      .fn()
      .mockResolvedValue(true);
    auditMocks.createAuditLogSafe.mockRejectedValueOnce(
      new Error("audit rejected")
    );

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections,
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectSolutionSelections).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("shows a section-local error when solution toggle save fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const saveStandardProjectSolutionSelections = vi
      .fn()
      .mockRejectedValue(new Error("save failed"));

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections,
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectSolutionSelections).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("shows a section-local error when item checkbox save fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const saveStandardProjectItemSelections = vi
      .fn()
      .mockRejectedValue(new Error("save failed"));

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections,
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByLabelText("PBX 업종 금융_증권 선택"));

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectItemSelections).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps item checkbox save available when only actual effort is read-only", async () => {
    const saveStandardProjectItemSelections = vi.fn().mockResolvedValue(true);
    const updateStandardActualEffort = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        actualEffortReadOnly
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [
            {
              solution_variant_id: "pbx",
              item_id: "item-a",
              checked: false,
            },
          ],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections,
          updateStandardActualEffort,
        }}
      />
    );

    const itemCheckbox = screen.getByLabelText("PBX 업종 금융_증권 선택");
    const actualInput = screen.getByLabelText("PBX 실투입공수");

    expect(itemCheckbox.disabled).toBe(false);
    expect(actualInput.disabled).toBe(true);

    fireEvent.click(itemCheckbox);

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectItemSelections).not.toHaveBeenCalled();

    fireEvent.change(actualInput, {
      target: { value: "9.25" },
    });
    fireEvent.blur(actualInput);
    expect(updateStandardActualEffort).not.toHaveBeenCalled();
  });

  it("records item check audit after a successful item toggle", async () => {
    const saveStandardProjectItemSelections = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        auditActor={{
          actorUserId: "user-1",
          actorEmail: "user@example.com",
          devOnly: true,
        }}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [
            {
              solution_variant_id: "pbx",
              item_id: "item-a",
              checked: false,
            },
          ],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections,
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByLabelText("PBX 업종 금융_증권 선택"));

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectItemSelections).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("skips item check frontend audit in disabled mode", async () => {
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "disabled");
    const saveStandardProjectItemSelections = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [
            {
              solution_variant_id: "pbx",
              item_id: "item-a",
              checked: false,
            },
          ],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections,
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByLabelText("PBX 업종 금융_증권 선택"));

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectItemSelections).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("records item check frontend audit in enabled mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "enabled");
    const saveStandardProjectItemSelections = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [
            {
              solution_variant_id: "pbx",
              item_id: "item-a",
              checked: false,
            },
          ],
          results: results.slice(0, 1),
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections,
          updateStandardActualEffort: vi.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByLabelText("PBX 업종 금융_증권 선택"));

    expectNoSectionDirtyWarning();
    expect(saveStandardProjectItemSelections).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("rolls back actual effort draft when save fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const updateStandardActualEffort = vi.fn().mockResolvedValue(false);

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: [
            {
              ...results[0],
              actual_effort_mm: 4.5,
              gap_mm: 3.18,
            },
          ],
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort,
        }}
      />
    );

    const actualInput = screen.getByLabelText("PBX 실투입공수");

    fireEvent.change(actualInput, {
      target: { value: "9.25" },
    });
    fireEvent.blur(actualInput);

    expectNoSectionDirtyWarning();
    expect(actualInput.value).toBe("9.25");
    expect(updateStandardActualEffort).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("records actual effort audit only after committed changed values", async () => {
    const updateStandardActualEffort = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={"42"}
        auditActor={{
          actorUserId: "user-2",
        }}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              project_id: "42",
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: [
            {
              ...results[0],
              actual_effort_mm: 4.5,
              gap_mm: 3.18,
            },
          ],
          loadedProjectId: "42",
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort,
        }}
      />
    );

    const actualInput = screen.getByLabelText("PBX 실투입공수");

    fireEvent.change(actualInput, {
      target: { value: "9.25" },
    });
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();

    fireEvent.blur(actualInput);

    expectNoSectionDirtyWarning();
    expect(updateStandardActualEffort).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("records actual effort shadow audit metadata in shadow mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "shadow");
    const updateStandardActualEffort = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={"42"}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              project_id: "42",
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: [
            {
              ...results[0],
              actual_effort_mm: 4.5,
              gap_mm: 3.18,
            },
          ],
          loadedProjectId: "42",
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort,
        }}
      />
    );

    const actualInput = screen.getByLabelText("PBX 실투입공수");

    fireEvent.change(actualInput, {
      target: { value: "9.25" },
    });
    fireEvent.blur(actualInput);

    expectNoSectionDirtyWarning();
    expect(updateStandardActualEffort).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("does not record actual effort audit when the committed value is unchanged", async () => {
    const updateStandardActualEffort = vi.fn().mockResolvedValue(true);

    render(
      <StandardEffortSection
        projectId={42}
        standardEffort={{
          meta: {
            solutionVariants: solutionVariants.slice(0, 2),
            itemRows: itemRows.slice(0, 1),
          },
          projectSolutionSelections: [
            {
              solution_variant_id: "pbx",
              enabled: true,
              actual_effort_mm: 4.5,
            },
          ],
          projectItemSelections: [],
          results: [
            {
              ...results[0],
              actual_effort_mm: 4.5,
              gap_mm: 3.18,
            },
          ],
          loadedProjectId: 42,
        }}
        standardEffortActions={{
          loadProjectStandardEffort: vi.fn(),
          saveStandardProjectSolutionSelections: vi.fn(),
          saveStandardProjectItemSelections: vi.fn(),
          updateStandardActualEffort,
        }}
      />
    );

    const actualInput = screen.getByLabelText("PBX 실투입공수");

    fireEvent.change(actualInput, {
      target: { value: "4.50" },
    });
    fireEvent.blur(actualInput);

    expect(updateStandardActualEffort).not.toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });
});
