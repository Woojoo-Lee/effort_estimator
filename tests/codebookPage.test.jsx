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

import CodebookPage from "../src/features/codebooks/pages/CodebookPage";

const storeState = vi.hoisted(() => ({
  current: {},
}));

vi.mock("../src/store/useEstimatorStore", () => ({
  useEstimatorStore: (selector) => selector(storeState.current),
}));

function createRows() {
  return [
    {
      id: "meta-1",
      group_code: "SOLUTION",
      code: "00",
      code_name: "솔루션",
      code_value: "00",
      description: "Solution group metadata",
      sort_order: 0,
      is_active: true,
      updated_at: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "3",
      group_code: "COMPLEXITY",
      code: "NORMAL",
      code_name: "보통",
      code_value: "1",
      description: "Normal complexity",
      sort_order: 1,
      is_active: true,
      updated_at: "2026-06-03T00:00:00.000Z",
    },
    {
      id: "4",
      group_code: "DIFFICULTY",
      code: "LOW",
      code_name: "낮음",
      code_value: "0.9",
      description: "Low difficulty",
      sort_order: 1,
      is_active: false,
      updated_at: "2026-06-04T00:00:00.000Z",
    },
    {
      id: "1",
      group_code: "SOLUTION",
      code: "PBX",
      code_name: "PBX",
      code_value: "PBX",
      description: "Private branch exchange",
      sort_order: 10,
      is_active: true,
      updated_at: "2026-06-01T00:00:00.000Z",
      password_hash: "should-not-render",
      email: "should-not-render@example.com",
    },
  ];
}

function setup(overrides = {}) {
  const state = {
    codebookRows: createRows(),
    isCodebookRowsBusy: false,
    isCodebookSaving: false,
    lastCodebookRowsError: "",
    refreshCodebookRows: vi.fn(),
    createCodebookRow: vi.fn().mockResolvedValue(true),
    updateCodebookRow: vi.fn().mockResolvedValue(true),
    setCodebookRowActive: vi.fn().mockResolvedValue(true),
    ...overrides,
  };

  storeState.current = state;

  return {
    state,
    ...render(<CodebookPage />),
  };
}

function getSectionByHeading(name) {
  return screen.getByRole("heading", { name }).closest("section");
}

function getCodeTable() {
  return getSectionByHeading("코드목록");
}

function getGroupList() {
  return getSectionByHeading("코드유형목록");
}

function getGroupDetail() {
  return getSectionByHeading("코드유형 상세");
}

function getCodeForm() {
  const form = screen.getByRole("heading", { name: "코드 상세" }).closest("form");

  expect(form).toBeTruthy();

  return within(form);
}

function clickGroup(groupCode) {
  const groupCell = within(getGroupList())
    .getAllByText(groupCode)
    .find((element) => element.closest("tr"));

  fireEvent.click(groupCell.closest("tr"));
}

function getCodeRow(code) {
  return within(getCodeTable())
    .getAllByText(code)
    .find((element) => element.closest("tr"))
    .closest("tr");
}

describe("CodebookPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the 2x2 manual-style layout without duplicated create CTAs", () => {
    const { state } = setup();

    expect(screen.queryByText("코드북 관리")).toBeNull();
    expect(
      screen.queryByText(/조회 조건, 콤보박스, 권한 관련 기준 코드/)
    ).toBeNull();
    expect(
      screen.queryByText(/권한 판정은 기존 admin\/sales\/viewer/)
    ).toBeNull();
    expect(screen.getByText("코드유형목록")).toBeTruthy();
    expect(screen.getByText("코드목록")).toBeTruthy();
    expect(screen.getByText("코드유형 상세")).toBeTruthy();
    expect(screen.getByText("코드 상세")).toBeTruthy();
    expect(screen.getAllByText("COMPLEXITY").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DIFFICULTY").length).toBeGreaterThan(0);
    expect(screen.getByText("솔루션")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "신규 코드 추가" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "신규" }).length).toBe(2);
    expect(screen.getAllByRole("button", { name: "저장" }).length).toBe(2);
    expect(within(getCodeTable()).getAllByText("PBX").length).toBeGreaterThan(
      0
    );
    expect(within(getCodeTable()).getByText("LOW")).toBeTruthy();
    expect(within(getCodeTable()).queryByText("00")).toBeNull();
    expect(within(getGroupList()).getByText("코드유형아이디")).toBeTruthy();
    expect(within(getGroupList()).getByText("코드유형명")).toBeTruthy();
    expect(within(getGroupList()).getByText("사용여부")).toBeTruthy();
    expect(within(getGroupList()).getByText("번호").className).toContain(
      "text-center"
    );
    expect(getGroupList().querySelector("col.w-12")).toBeTruthy();
    expect(getGroupList().querySelector("col.w-32")).toBeTruthy();
    expect(getGroupList().querySelector("col.w-20")).toBeTruthy();
    expect(
      within(getGroupList()).getByText("코드유형아이디").className
    ).toContain("text-center");
    expect(within(getGroupList()).getByText("코드유형명").className).toContain(
      "text-left"
    );
    expect(within(getGroupList()).queryByText("코드분류")).toBeNull();
    expect(within(getGroupList()).queryByText("코드변경")).toBeNull();
    expect(within(getCodeTable()).getByText("코드아이디")).toBeTruthy();
    expect(within(getCodeTable()).getByText("코드명")).toBeTruthy();
    expect(within(getCodeTable()).getByText("사용여부")).toBeTruthy();
    expect(within(getCodeTable()).getByText("번호").className).toContain(
      "text-center"
    );
    expect(getCodeTable().querySelector("col.w-12")).toBeTruthy();
    expect(getCodeTable().querySelector("col.w-28")).toBeTruthy();
    expect(getCodeTable().querySelector("col.w-20")).toBeTruthy();
    expect(within(getCodeTable()).getByText("코드아이디").className).toContain(
      "text-center"
    );
    expect(within(getCodeTable()).getByText("코드명").className).toContain(
      "text-left"
    );
    expect(within(getCodeTable()).queryByText("코드값")).toBeNull();
    expect(within(getCodeTable()).queryByText("설명")).toBeNull();
    expect(within(getCodeTable()).queryByText("정렬순서")).toBeNull();
    expect(within(getCodeTable()).queryByText("Private branch exchange")).toBeNull();
    expect(screen.queryByText(/password_hash/i)).toBeNull();
    expect(screen.queryByText(/email/i)).toBeNull();
    expect(screen.queryByText("should-not-render")).toBeNull();
    expect(screen.queryByText(/삭제/)).toBeNull();
    expect(screen.queryByText(/정말 삭제/)).toBeNull();
    expect(screen.queryByText(/common_code에서 code='00'/)).toBeNull();
    expect(screen.queryByText(/개별 코드 row/)).toBeNull();
    expect(
      within(getGroupDetail()).getByLabelText("코드유형아이디").className
    ).toContain("h-8");
    expect(getCodeForm().queryByLabelText(/코드유형아이디/)).toBeNull();
    expect(getCodeForm().getByText(/선택 코드유형:/)).toBeTruthy();
    expect(getCodeForm().getByLabelText(/코드아이디/).className).toContain(
      "h-8"
    );
    expect(state.refreshCodebookRows).toHaveBeenCalled();
  });

  it("filters by group, search field, active state, and reset", () => {
    setup();

    fireEvent.change(screen.getByLabelText("코드분류"), {
      target: { value: "DIFFICULTY" },
    });
    fireEvent.change(screen.getByLabelText("조회조건"), {
      target: { value: "code_name" },
    });
    fireEvent.change(screen.getByLabelText("검색어"), {
      target: { value: "낮음" },
    });
    fireEvent.change(screen.getAllByLabelText("사용여부")[0], {
      target: { value: "INACTIVE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    expect(within(getCodeTable()).getByText("LOW")).toBeTruthy();
    expect(within(getCodeTable()).queryByText("PBX")).toBeNull();
    expect(within(getCodeTable()).getByText("미사용")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "초기화" }));

    expect(within(getCodeTable()).getByText("LOW")).toBeTruthy();
    expect(within(getCodeTable()).getAllByText("PBX").length).toBeGreaterThan(
      0
    );
  });

  it("renders empty state without a top-level create CTA", () => {
    setup({ codebookRows: [] });

    expect(screen.getByText("등록된 코드유형이 없습니다.")).toBeTruthy();
    expect(
      screen.getAllByText(
        "등록된 코드가 없습니다. 하단 코드 상세에서 신규 코드를 입력하세요."
      ).length
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "신규 코드 추가" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "신규" }).length).toBe(2);
  });

  it("displays fetch errors and keeps the refresh action available", () => {
    const { state } = setup({
      codebookRows: [],
      lastCodebookRowsError: "코드북 목록 조회에 실패했습니다.",
    });

    expect(screen.getByText("코드북을 불러오지 못했습니다.")).toBeTruthy();
    expect(
      screen.queryByText(
        "등록된 코드가 없습니다. 하단 코드 상세에서 신규 코드를 입력하세요."
      )
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(state.refreshCodebookRows).toHaveBeenCalledTimes(2);
  });

  it("resets code type detail fields when creating a new code type draft", () => {
    setup();
    clickGroup("SOLUTION");

    fireEvent.change(within(getGroupDetail()).getByLabelText("코드유형명"), {
      target: { value: "변경된 솔루션" },
    });
    fireEvent.click(within(getGroupDetail()).getByRole("button", { name: "신규" }));

    expect(within(getGroupDetail()).getByLabelText("코드유형아이디").value).toBe("");
    expect(within(getGroupDetail()).getByLabelText("코드유형명").value).toBe("");
    expect(within(getGroupDetail()).queryByLabelText("설명")).toBeNull();
    expect(within(getGroupDetail()).queryByLabelText("코드변경여부")).toBeNull();
    expect(within(getGroupDetail()).getByLabelText("사용여부").value).toBe(
      "true"
    );
    expect(
      within(getGroupDetail()).queryByText(
        /신규 코드유형은 저장 후 코드유형목록에 표시됩니다/
      )
    ).toBeNull();
  });

  it("validates and creates a code type metadata row", async () => {
    const { state } = setup({ codebookRows: [] });

    fireEvent.click(within(getGroupDetail()).getByRole("button", { name: "신규" }));
    fireEvent.click(within(getGroupDetail()).getByRole("button", { name: "저장" }));

    expect(screen.getByText("코드유형아이디와 코드유형명은 필수입니다.")).toBeTruthy();
    expect(state.createCodebookRow).not.toHaveBeenCalled();

    fireEvent.change(within(getGroupDetail()).getByLabelText("코드유형아이디"), {
      target: { value: "CHANNEL" },
    });
    fireEvent.change(within(getGroupDetail()).getByLabelText("코드유형명"), {
      target: { value: "채널" },
    });
    fireEvent.click(within(getGroupDetail()).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(state.createCodebookRow).toHaveBeenCalledWith(
        expect.objectContaining({
          group_code: "CHANNEL",
          code: "00",
          code_name: "채널",
          code_value: "00",
          description: null,
          sort_order: 0,
          is_active: true,
        })
      );
    });
    expect(await screen.findByText("코드유형 정보를 저장했습니다.")).toBeTruthy();
    expect(getCodeForm().queryByLabelText(/코드유형아이디/)).toBeNull();
    expect(getCodeForm().getByText("선택 코드유형: CHANNEL")).toBeTruthy();
    expect(getCodeForm().getByLabelText(/코드아이디/).value).toBe("");
    expect(getCodeForm().getByLabelText(/코드명/).value).toBe("");
  });

  it("updates an existing code type metadata row", async () => {
    const { state } = setup();

    clickGroup("SOLUTION");
    fireEvent.change(within(getGroupDetail()).getByLabelText("코드유형명"), {
      target: { value: "솔루션 구분" },
    });
    fireEvent.change(within(getGroupDetail()).getByLabelText("사용여부"), {
      target: { value: "false" },
    });
    fireEvent.click(within(getGroupDetail()).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(state.updateCodebookRow).toHaveBeenCalledWith(
        "meta-1",
        expect.objectContaining({
          group_code: "SOLUTION",
          code: "00",
          code_name: "솔루션 구분",
          code_value: "00",
          description: "Solution group metadata",
          sort_order: 0,
          is_active: false,
        })
      );
    });
    expect(await screen.findByText("코드유형 정보를 저장했습니다.")).toBeTruthy();
    expect(getCodeForm().queryByLabelText(/코드유형아이디/)).toBeNull();
    expect(getCodeForm().getByText("선택 코드유형: SOLUTION")).toBeTruthy();
  });

  it("uses selected group or code type draft as the new code detail default", () => {
    setup();

    clickGroup("DIFFICULTY");
    fireEvent.click(getCodeForm().getByRole("button", { name: "신규" }));
    expect(getCodeForm().getByText("선택 코드유형: DIFFICULTY")).toBeTruthy();

    fireEvent.click(within(getGroupDetail()).getByRole("button", { name: "신규" }));
    fireEvent.change(within(getGroupDetail()).getByLabelText("코드유형아이디"), {
      target: { value: "CHANNEL" },
    });
    fireEvent.click(getCodeForm().getByRole("button", { name: "신규" }));

    expect(getCodeForm().getByText("선택 코드유형: CHANNEL")).toBeTruthy();
  });

  it("does not overwrite an existing code row identity from code type draft changes", () => {
    setup();
    clickGroup("SOLUTION");
    fireEvent.click(getCodeRow("PBX"));

    fireEvent.change(within(getGroupDetail()).getByLabelText("코드유형아이디"), {
      target: { value: "CHANNEL" },
    });

    expect(getCodeForm().getByText("선택 코드유형: SOLUTION")).toBeTruthy();
    expect(getCodeForm().getByLabelText(/코드아이디/).value).toBe("PBX");
  });

  it("validates required fields before creating a codebook row", async () => {
    setup({ codebookRows: [] });

    fireEvent.click(getCodeForm().getByRole("button", { name: "신규" }));
    fireEvent.change(getCodeForm().getByLabelText(/코드아이디/), {
      target: { value: "NEW" },
    });
    fireEvent.change(getCodeForm().getByLabelText(/코드명/), {
      target: { value: "New Code" },
    });
    fireEvent.click(getCodeForm().getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText("코드유형아이디, 코드아이디, 코드명은 필수입니다.")
    ).toBeTruthy();
  });

  it("blocks reserved code 00 in the code detail form", async () => {
    const { state } = setup();

    clickGroup("SOLUTION");
    fireEvent.click(getCodeForm().getByRole("button", { name: "신규" }));
    fireEvent.change(getCodeForm().getByLabelText(/코드아이디/), {
      target: { value: "00" },
    });
    fireEvent.change(getCodeForm().getByLabelText(/코드명/), {
      target: { value: "Reserved" },
    });
    fireEvent.click(getCodeForm().getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText("코드 00은 코드유형 정보 저장용 예약값입니다.")
    ).toBeTruthy();
    expect(state.createCodebookRow).not.toHaveBeenCalled();
  });

  it("creates a new codebook row through the existing store action", async () => {
    const { state } = setup();

    clickGroup("DIFFICULTY");
    fireEvent.click(getCodeForm().getByRole("button", { name: "신규" }));
    fireEvent.change(getCodeForm().getByLabelText(/코드아이디/), {
      target: { value: "EDIT" },
    });
    fireEvent.change(getCodeForm().getByLabelText(/코드명/), {
      target: { value: "편집" },
    });
    fireEvent.change(getCodeForm().getByLabelText("사용여부"), {
      target: { value: "false" },
    });
    fireEvent.click(getCodeForm().getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(state.createCodebookRow).toHaveBeenCalledWith(
        expect.objectContaining({
          group_code: "DIFFICULTY",
          code: "EDIT",
          code_name: "편집",
          code_value: "EDIT",
          description: null,
          sort_order: 0,
          is_active: false,
        })
      );
    });
    expect(await screen.findByText("코드 등록이 완료되었습니다.")).toBeTruthy();
  });

  it("updates an existing row and keeps group_code and code locked", async () => {
    const { state } = setup();
    clickGroup("SOLUTION");
    const row = getCodeRow("PBX");

    fireEvent.click(row);

    expect(getCodeForm().queryByLabelText(/코드유형아이디/)).toBeNull();
    expect(getCodeForm().getByText("선택 코드유형: SOLUTION")).toBeTruthy();
    expect(getCodeForm().getByLabelText(/코드아이디/).disabled).toBe(true);
    expect(getCodeForm().getByRole("button", { name: "저장" }).disabled).toBe(
      true
    );

    fireEvent.change(getCodeForm().getByLabelText(/코드명/), {
      target: { value: "IP PBX" },
    });

    expect(screen.getByText("변경됨")).toBeTruthy();
    fireEvent.click(getCodeForm().getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(state.updateCodebookRow).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          group_code: "SOLUTION",
          code: "PBX",
          code_name: "IP PBX",
          code_value: "PBX",
          description: "Private branch exchange",
          sort_order: 10,
          is_active: true,
        })
      );
    });
    expect(await screen.findByText("코드 수정이 완료되었습니다.")).toBeTruthy();
  });

  it("keeps the detail form open and displays a message when save fails", async () => {
    setup({
      updateCodebookRow: vi.fn().mockResolvedValue(false),
    });
    clickGroup("SOLUTION");

    fireEvent.click(getCodeRow("PBX"));
    fireEvent.change(getCodeForm().getByLabelText(/코드명/), {
      target: { value: "Broken" },
    });
    fireEvent.click(getCodeForm().getByRole("button", { name: "저장" }));

    expect(await screen.findByText("코드 수정에 실패했습니다.")).toBeTruthy();
    expect(getCodeForm().getByLabelText(/코드명/)).toBeTruthy();
    expect(screen.getByText("변경됨")).toBeTruthy();
  });

});
