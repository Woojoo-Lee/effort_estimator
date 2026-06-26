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

import { getAppRoutes, isKnownRoute } from "../src/app/routes";
import { AUDIT_EVENT_TYPES, AUDIT_TARGET_TYPES } from "../src/features/audit";
import { AuthPermissionProvider, PERMISSIONS } from "../src/features/auth";
import StandardEffortMetaPage from "../src/features/standardEffortMeta/pages/StandardEffortMetaPage";

const repositoryMocks = vi.hoisted(() => ({
  fetchStandardEffortMetaAdmin: vi.fn(),
  upsertStandardBaseEffortRows: vi.fn(),
  upsertStandardCoefficientRows: vi.fn(),
  updateStandardSolutionVariantActive: vi.fn(),
  updateStandardItemActive: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  createAuditLogSafe: vi.fn(),
}));

vi.mock("../src/services/standardEffortMetaRepository", async () => {
  const actual = await vi.importActual(
    "../src/services/standardEffortMetaRepository"
  );

  return {
    ...actual,
    fetchStandardEffortMetaAdmin:
      repositoryMocks.fetchStandardEffortMetaAdmin,
    upsertStandardBaseEffortRows:
      repositoryMocks.upsertStandardBaseEffortRows,
    upsertStandardCoefficientRows:
      repositoryMocks.upsertStandardCoefficientRows,
    updateStandardSolutionVariantActive:
      repositoryMocks.updateStandardSolutionVariantActive,
    updateStandardItemActive: repositoryMocks.updateStandardItemActive,
  };
});

vi.mock("../src/features/audit", async () => {
  const actual = await vi.importActual("../src/features/audit");

  return {
    ...actual,
    createAuditLogSafe: auditMocks.createAuditLogSafe,
  };
});

const metaFixture = {
  solutions: [
    {
      solution_code: "pbx",
      solution_name: "PBX",
      display_order: 10,
      active: true,
    },
  ],
  solutionVariants: [
    {
      solution_variant_id: "variant-pbx",
      solution_code: "pbx",
      solution_name: "PBX",
      variant_code: "avaya",
      variant_name: "Avaya",
      display_name: "PBX",
      display_order: 10,
      active: true,
    },
    {
      solution_variant_id: "variant-wfm",
      solution_code: "wfm",
      solution_name: "WFM",
      variant_code: "v4",
      variant_name: "4",
      display_name: "WFM",
      display_order: 110,
      active: false,
    },
  ],
  baseEffortRows: [
    {
      solution_variant_id: "variant-pbx",
      phase_code: "analysis",
      phase_name: "분석",
      effort_mm: 1,
      display_order: 10,
      active: true,
    },
    {
      solution_variant_id: "variant-pbx",
      phase_code: "design",
      phase_name: "설계",
      effort_mm: 1,
      display_order: 20,
      active: true,
    },
    {
      solution_variant_id: "variant-pbx",
      phase_code: "implementation",
      phase_name: "구현",
      effort_mm: 2,
      display_order: 30,
      active: true,
    },
    {
      solution_variant_id: "variant-pbx",
      phase_code: "test",
      phase_name: "단위/통합테스트",
      effort_mm: 1,
      display_order: 40,
      active: true,
    },
    {
      solution_variant_id: "variant-pbx",
      phase_code: "deployment",
      phase_name: "이행 및 모니터링",
      effort_mm: 1,
      display_order: 50,
      active: true,
    },
    {
      solution_variant_id: "variant-wfm",
      phase_code: "analysis",
      phase_name: "분석",
      effort_mm: 8,
      display_order: 10,
      active: true,
    },
  ],
  itemRows: [
    {
      item_id: "item-1",
      category_l1: "공통정보",
      category_l2: null,
      item_name: "업종",
      item_option: "금융_증권",
      display_order: 10,
      excel_row_no: 13,
      active: true,
    },
    {
      item_id: "item-2",
      category_l1: "추가 요구사항",
      category_l2: null,
      item_name: "보안",
      item_option: null,
      display_order: 20,
      excel_row_no: 64,
      active: false,
    },
  ],
  coefficientRows: [
    {
      item_id: "item-1",
      solution_variant_id: "variant-pbx",
      coefficient: 0.5,
      active: true,
    },
  ],
};

function mockSuccessfulSave() {
  repositoryMocks.upsertStandardBaseEffortRows.mockImplementation(
    (solutionVariantId, rows) =>
      Promise.resolve(
        rows.map((row) => ({
          ...row,
          solution_variant_id: solutionVariantId,
        }))
      )
  );
  repositoryMocks.upsertStandardCoefficientRows.mockImplementation(
    (itemId, rows) =>
      Promise.resolve(
        rows.map((row) => ({
          ...row,
          item_id: itemId,
        }))
      )
  );
  repositoryMocks.updateStandardSolutionVariantActive.mockImplementation(
    (solutionVariantId, active) =>
      Promise.resolve({
        ...metaFixture.solutionVariants.find(
          (variant) => variant.solution_variant_id === solutionVariantId
        ),
        active,
      })
  );
  repositoryMocks.updateStandardItemActive.mockImplementation((itemId, active) =>
    Promise.resolve({
      ...metaFixture.itemRows.find((item) => item.item_id === itemId),
      active,
    })
  );
}

function mockSuccessfulAudit() {
  auditMocks.createAuditLogSafe.mockResolvedValue({
    ok: true,
    data: {
      audit_log_id: "audit-1",
    },
    error: null,
  });
}

async function renderEnabledPage() {
  vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
  vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");
  repositoryMocks.fetchStandardEffortMetaAdmin.mockResolvedValue(metaFixture);
  mockSuccessfulSave();
  mockSuccessfulAudit();

  render(<StandardEffortMetaPage />);

  return screen.findByText("표준공수 메타 관리");
}

async function renderDevPermissionPage(permissionCodes = []) {
  vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
  vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");
  repositoryMocks.fetchStandardEffortMetaAdmin.mockResolvedValue(metaFixture);
  mockSuccessfulSave();
  mockSuccessfulAudit();

  render(
    <AuthPermissionProvider
      env={{
        VITE_AUTH_PERMISSION_MODE: "dev",
        VITE_DEV_AUTH_PERMISSION_CODES: [
          PERMISSIONS.ROUTE_STANDARD_EFFORT_META_READ,
          ...permissionCodes,
        ].join(","),
      }}
    >
      <StandardEffortMetaPage />
    </AuthPermissionProvider>
  );

  return screen.findByText("표준공수 메타 관리");
}

describe("StandardEffortMetaPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    repositoryMocks.fetchStandardEffortMetaAdmin.mockReset();
    repositoryMocks.upsertStandardBaseEffortRows.mockReset();
    repositoryMocks.upsertStandardCoefficientRows.mockReset();
    repositoryMocks.updateStandardSolutionVariantActive.mockReset();
    repositoryMocks.updateStandardItemActive.mockReset();
    auditMocks.createAuditLogSafe.mockReset();
  });

  it("hides the route and blocks direct page access when the feature flag is false", () => {
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "false");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "disabled");

    render(<StandardEffortMetaPage />);

    expect(screen.getByText("사용할 수 없는 기능입니다.")).toBeTruthy();
    expect(
      getAppRoutes().some((route) => route.path === "/standard-effort-meta")
    ).toBe(false);
    expect(isKnownRoute("/standard-effort-meta")).toBe(false);
    expect(repositoryMocks.fetchStandardEffortMetaAdmin).not.toHaveBeenCalled();
  });

  it("blocks direct page access when auth guard is enabled and route permission is missing", () => {
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
    vi.stubEnv("VITE_AUTH_PERMISSION_MODE", "dev");

    render(
      <AuthPermissionProvider
        env={{
          VITE_AUTH_PERMISSION_MODE: "dev",
          VITE_DEV_AUTH_PERMISSION_CODES: PERMISSIONS.ROUTE_ESTIMATOR_READ,
        }}
      >
        <StandardEffortMetaPage />
      </AuthPermissionProvider>
    );

    expect(screen.getByText("접근 권한이 없습니다.")).toBeTruthy();
    expect(repositoryMocks.fetchStandardEffortMetaAdmin).not.toHaveBeenCalled();
  });

  it("renders editable base effort fields and editable coefficient grid", async () => {
    await renderEnabledPage();

    expect(
      getAppRoutes().some((route) => route.path === "/standard-effort-meta")
    ).toBe(true);
    expect(isKnownRoute("/standard-effort-meta")).toBe(true);

    const baseGrid = await screen.findByRole("region", {
      name: "표준공수 솔루션 기본공수",
    });
    expect(within(baseGrid).getByText("분석(M/M)")).toBeTruthy();
    expect(within(baseGrid).getByText("기본공수합(M/M)")).toBeTruthy();
    expect(within(baseGrid).getByLabelText("PBX 분석(M/M)")).toBeTruthy();

    const initialSaveButton = within(
      within(baseGrid).getByLabelText("PBX 분석(M/M)").closest("tr")
    ).getByRole("button", { name: "저장" });
    expect(initialSaveButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const coefficientGrid = screen.getByRole("region", {
      name: "표준공수 기능항목 계수",
    });
    const coefficientScroll = screen.getByTestId(
      "standard-coefficient-grid-scroll"
    );
    const coefficientTable = screen.getByTestId(
      "standard-coefficient-grid-table"
    );
    const coefficientColumns = coefficientTable.querySelectorAll("col");

    expect(screen.getByTestId("standard-effort-meta-page").className).toContain(
      "overflow-x-hidden"
    );
    expect(screen.getByTestId("standard-coefficient-top-scroll")).toBeTruthy();
    expect(coefficientScroll.className).toContain("overflow-auto");
    expect(coefficientTable.className).toContain("w-full");
    expect(coefficientTable.className).toContain("min-w-max");
    expect(coefficientTable.className).toContain("table-fixed");
    expect(coefficientTable.className).not.toContain("min-w-full");
    expect(coefficientTable.querySelector("thead").className).toContain(
      "sticky"
    );
    expect(coefficientColumns[0].style.width).toBe("112px");
    expect(coefficientColumns[1].style.width).toBe("232px");
    expect(coefficientColumns[2].style.width).toBe("180px");
    expect(coefficientColumns[3].style.width).toBe("64px");
    expect(coefficientColumns[5].style.width).toBe("72px");
    expect(
      screen.getByTestId("coefficient-category-header").className
    ).toContain("text-center");
    expect(screen.getByTestId("coefficient-item-header").className).toContain(
      "text-center"
    );
    expect(screen.getByTestId("coefficient-option-header").className).toContain(
      "text-center"
    );
    expect(
      screen.getByTestId("coefficient-solution-header-variant-wfm").className
    ).toContain("text-center");
    expect(within(coefficientGrid).getAllByText("공통정보").length).toBeGreaterThan(
      0
    );
    expect(
      within(coefficientGrid).getAllByText("추가 요구사항").length
    ).toBeGreaterThan(0);
    expect(
      within(coefficientGrid).getByText(
        "계수는 단위 없는 배율 값입니다. 누락 값은 0으로 표시합니다."
      )
    ).toBeTruthy();

    const pbxCoefficientInput =
      within(coefficientGrid).getByLabelText("업종 PBX 계수");
    const wfmCoefficientInput =
      within(coefficientGrid).getByLabelText("업종 WFM 계수");

    expect(pbxCoefficientInput.value).toBe("0.5");
    expect(wfmCoefficientInput.value).toBe("0");
    const coefficientRowCells = pbxCoefficientInput.closest("tr").querySelectorAll("td");
    expect(coefficientRowCells[0].className).toContain("text-left");
    expect(coefficientRowCells[1].className).toContain("text-left");
    expect(coefficientRowCells[2].className).toContain("text-left");
    expect(pbxCoefficientInput.className).not.toContain("max-w-12");
    expect(pbxCoefficientInput.className).toContain("min-w-[56px]");
    expect(pbxCoefficientInput.className).toContain("max-w-[72px]");
    expect(pbxCoefficientInput.className).toContain("text-center");
    expect(pbxCoefficientInput.className).toContain("tabular-nums");
    expect(wfmCoefficientInput.className).not.toContain("max-w-12");
    expect(wfmCoefficientInput.className).toContain("min-w-[56px]");
    expect(wfmCoefficientInput.className).toContain("max-w-[72px]");
    expect(wfmCoefficientInput.className).toContain("text-center");
    expect(
      within(pbxCoefficientInput.closest("tr")).getByRole("button", {
        name: "저장",
      }).disabled
    ).toBe(true);
  });

  it("toggles a solution variant active state without clearing base effort dirty state", async () => {
    await renderEnabledPage();

    const input = screen.getByLabelText("PBX 분석(M/M)");
    const row = input.closest("tr");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(screen.getByLabelText("PBX 사용 여부"));

    await waitFor(() =>
      expect(
        repositoryMocks.updateStandardSolutionVariantActive
      ).toHaveBeenCalledWith("variant-pbx", false)
    );
    expect(screen.getByLabelText("PBX 사용 여부").checked).toBe(false);
    expect(within(row).getByText("변경됨")).toBeTruthy();
  });

  it("writes a non-blocking audit log after solution variant active toggle succeeds", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByLabelText("PBX 사용 여부"));

    await waitFor(() =>
      expect(auditMocks.createAuditLogSafe).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_ACTIVE_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: "variant-pbx",
          before: {
            active: true,
          },
          after: {
            active: false,
          },
          metadata: expect.objectContaining({
            section: "solution_variant_active",
            solution_variant_id: "variant-pbx",
          }),
        })
      )
    );
  });

  it("rolls back a solution variant active toggle when save fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await renderEnabledPage();
    repositoryMocks.updateStandardSolutionVariantActive.mockRejectedValueOnce(
      new Error("variant active 저장 실패")
    );

    const checkbox = screen.getByLabelText("PBX 사용 여부");

    fireEvent.click(checkbox);

    expect(await screen.findByText("variant active 저장 실패")).toBeTruthy();
    expect(checkbox.checked).toBe(true);
    consoleError.mockRestore();
  });

  it("marks a base effort row dirty and saves the row", async () => {
    await renderEnabledPage();

    const input = screen.getByLabelText("PBX 분석(M/M)");
    const row = input.closest("tr");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });

    expect(within(row).getByText("변경됨")).toBeTruthy();
    const saveButton = within(row).getByRole("button", { name: "저장" });
    expect(saveButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await screen.findByText("저장 완료");
    expect(repositoryMocks.upsertStandardBaseEffortRows).toHaveBeenCalledWith(
      "variant-pbx",
      expect.arrayContaining([
        expect.objectContaining({
          phase_code: "analysis",
          phase_name: "분석",
          effort_mm: 2.5,
          display_order: 10,
          active: true,
        }),
      ])
    );
    await waitFor(() => expect(screen.queryByText("변경됨")).toBeNull());
  });

  it("writes a non-blocking audit log after base effort save succeeds", async () => {
    await renderEnabledPage();

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() =>
      expect(auditMocks.createAuditLogSafe).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType:
            AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_BASE_EFFORT_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: "variant-pbx",
          actorUserId: null,
          actorEmail: null,
          metadata: expect.objectContaining({
            section: "base_effort",
            solution_variant_id: "variant-pbx",
            unit: "M/M",
          }),
        })
      )
    );

    const auditPayload = auditMocks.createAuditLogSafe.mock.calls.at(-1)[0];

    expect(auditPayload.before).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase_code: "analysis",
          effort_mm: 1,
        }),
      ])
    );
    expect(auditPayload.after).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase_code: "analysis",
          effort_mm: 2.5,
        }),
      ])
    );
  });

  it("writes base effort audit in supabase auto mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "auto");
    await renderEnabledPage();

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() => expect(auditMocks.createAuditLogSafe).toHaveBeenCalled());
    expect(auditMocks.createAuditLogSafe.mock.calls.at(-1)[0].metadata).toEqual(
      expect.objectContaining({
        section: "base_effort",
        unit: "M/M",
        audit_source: "frontend",
        data_backend: "supabase",
      })
    );
  });

  it("skips base effort frontend audit in api auto mode without breaking save UX", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "auto");
    await renderEnabledPage();

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() => expect(screen.queryByText("변경됨")).toBeNull());
    expect(repositoryMocks.upsertStandardBaseEffortRows).toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("keeps base effort save successful when audit logging fails", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await renderEnabledPage();
    auditMocks.createAuditLogSafe.mockResolvedValueOnce({
      ok: false,
      data: null,
      error: new Error("audit failed"),
    });

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() => expect(screen.queryByText("변경됨")).toBeNull());
    await waitFor(() => expect(auditMocks.createAuditLogSafe).toHaveBeenCalled());
    await waitFor(() => expect(consoleWarn).toHaveBeenCalled());

    consoleWarn.mockRestore();
  });

  it("keeps base effort save successful when audit logging rejects", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await renderEnabledPage();
    auditMocks.createAuditLogSafe.mockRejectedValueOnce(new Error("audit rejected"));

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() => expect(screen.queryByText("변경됨")).toBeNull());
    await waitFor(() => expect(consoleWarn).toHaveBeenCalled());

    consoleWarn.mockRestore();
  });

  it("normalizes an empty base effort draft to zero when saving", async () => {
    await renderEnabledPage();

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "" },
    });
    fireEvent.click(within(input.closest("tr")).getByRole("button", { name: "저장" }));

    await screen.findByText("저장 완료");
    expect(repositoryMocks.upsertStandardBaseEffortRows).toHaveBeenCalledWith(
      "variant-pbx",
      expect.arrayContaining([
        expect.objectContaining({
          phase_code: "analysis",
          effort_mm: 0,
        }),
      ])
    );
  });

  it("keeps the draft dirty when base effort save fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await renderEnabledPage();
    repositoryMocks.upsertStandardBaseEffortRows.mockRejectedValueOnce(
      new Error("기본공수 저장 실패")
    );

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(within(input.closest("tr")).getByRole("button", { name: "저장" }));

    expect(await screen.findByText("기본공수 저장 실패")).toBeTruthy();
    expect(input.value).toBe("2.5");
    expect(screen.getByText("변경됨")).toBeTruthy();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("resets a dirty base effort row to the loaded value", async () => {
    await renderEnabledPage();

    const input = screen.getByLabelText("PBX 분석(M/M)");

    fireEvent.change(input, {
      target: { value: "2.5" },
    });
    fireEvent.click(within(input.closest("tr")).getByRole("button", { name: "되돌리기" }));

    expect(input.value).toBe("1");
    expect(screen.queryByText("변경됨")).toBeNull();
  });

  it("marks a coefficient row dirty and saves the row", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");
    const row = input.closest("tr");

    fireEvent.change(input, {
      target: { value: "0.75" },
    });

    expect(within(row).getByText("변경됨")).toBeTruthy();
    const saveButton = within(row).getByRole("button", { name: "저장" });
    expect(saveButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await screen.findByText("저장 완료");
    expect(repositoryMocks.upsertStandardCoefficientRows).toHaveBeenCalledWith(
      "item-1",
      expect.arrayContaining([
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          coefficient: 0.75,
          active: true,
        }),
        expect.objectContaining({
          solution_variant_id: "variant-wfm",
          coefficient: 0,
          active: true,
        }),
      ])
    );
    await waitFor(() => expect(screen.queryByText("변경됨")).toBeNull());
  });

  it("writes a non-blocking audit log after coefficient save succeeds", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");

    fireEvent.change(input, {
      target: { value: "0.75" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() =>
      expect(auditMocks.createAuditLogSafe).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType:
            AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_COEFFICIENT_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: "item-1",
          metadata: expect.objectContaining({
            section: "coefficient",
            item_id: "item-1",
            coefficient_unit: "unitless",
          }),
        })
      )
    );

    const auditPayload = auditMocks.createAuditLogSafe.mock.calls.at(-1)[0];

    expect(auditPayload.before).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          coefficient: 0.5,
        }),
      ])
    );
    expect(auditPayload.after).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          coefficient: 0.75,
        }),
      ])
    );
  });

  it("skips coefficient frontend audit in disabled mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "supabase");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "disabled");
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");

    fireEvent.change(input, {
      target: { value: "0.75" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() => expect(screen.queryByText("변경됨")).toBeNull());
    expect(repositoryMocks.upsertStandardCoefficientRows).toHaveBeenCalled();
    expect(auditMocks.createAuditLogSafe).not.toHaveBeenCalled();
  });

  it("writes coefficient frontend audit in enabled mode with decorated metadata", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "enabled");
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");

    fireEvent.change(input, {
      target: { value: "0.75" },
    });
    fireEvent.click(
      within(input.closest("tr")).getByRole("button", { name: "저장" })
    );

    await screen.findByText("저장 완료");
    await waitFor(() => expect(auditMocks.createAuditLogSafe).toHaveBeenCalled());
    expect(auditMocks.createAuditLogSafe.mock.calls.at(-1)[0].metadata).toEqual(
      expect.objectContaining({
        section: "coefficient",
        coefficient_unit: "unitless",
        audit_source: "frontend",
        data_backend: "api",
      })
    );
  });

  it("normalizes an empty coefficient draft to zero when saving", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");

    fireEvent.change(input, {
      target: { value: "" },
    });
    fireEvent.click(within(input.closest("tr")).getByRole("button", { name: "저장" }));

    await screen.findByText("저장 완료");
    expect(repositoryMocks.upsertStandardCoefficientRows).toHaveBeenCalledWith(
      "item-1",
      expect.arrayContaining([
        expect.objectContaining({
          solution_variant_id: "variant-pbx",
          coefficient: 0,
        }),
      ])
    );
  });

  it("keeps the coefficient draft dirty when save fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await renderEnabledPage();
    repositoryMocks.upsertStandardCoefficientRows.mockRejectedValueOnce(
      new Error("계수 저장 실패")
    );

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");

    fireEvent.change(input, {
      target: { value: "0.75" },
    });
    fireEvent.click(within(input.closest("tr")).getByRole("button", { name: "저장" }));

    expect(await screen.findByText("계수 저장 실패")).toBeTruthy();
    expect(input.value).toBe("0.75");
    expect(screen.getByText("변경됨")).toBeTruthy();
    consoleError.mockRestore();
  });

  it("resets a dirty coefficient row to the loaded value", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");

    fireEvent.change(input, {
      target: { value: "0.75" },
    });
    fireEvent.click(within(input.closest("tr")).getByRole("button", { name: "되돌리기" }));

    expect(input.value).toBe("0.5");
    expect(screen.queryByText("변경됨")).toBeNull();
  });

  it("toggles a standard item active state without clearing coefficient dirty state", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const input = screen.getByLabelText("업종 PBX 계수");
    const row = input.closest("tr");

    fireEvent.change(input, {
      target: { value: "0.75" },
    });
    fireEvent.click(screen.getByLabelText("업종 사용 여부"));

    await waitFor(() =>
      expect(repositoryMocks.updateStandardItemActive).toHaveBeenCalledWith(
        "item-1",
        false
      )
    );
    expect(screen.getByLabelText("업종 사용 여부").checked).toBe(false);
    expect(within(row).getByText("변경됨")).toBeTruthy();
  });

  it("writes a non-blocking audit log after standard item active toggle succeeds", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));
    fireEvent.click(screen.getByLabelText("업종 사용 여부"));

    await waitFor(() =>
      expect(auditMocks.createAuditLogSafe).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_ACTIVE_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: "item-1",
          before: {
            active: true,
          },
          after: {
            active: false,
          },
          metadata: expect.objectContaining({
            section: "item_active",
            item_id: "item-1",
          }),
        })
      )
    );
  });

  it("writes shadow metadata after active toggle in shadow mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_FRONTEND_AUDIT_MODE", "shadow");
    await renderEnabledPage();

    fireEvent.click(screen.getByLabelText("PBX 사용 여부"));

    await waitFor(() => expect(auditMocks.createAuditLogSafe).toHaveBeenCalled());
    expect(auditMocks.createAuditLogSafe.mock.calls.at(-1)[0].metadata).toEqual(
      expect.objectContaining({
        section: "solution_variant_active",
        solution_variant_id: "variant-pbx",
        audit_source: "frontend",
        data_backend: "api",
        frontend_shadow: true,
      })
    );
  });

  it("rolls back a standard item active toggle when save fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await renderEnabledPage();
    repositoryMocks.updateStandardItemActive.mockRejectedValueOnce(
      new Error("item active 저장 실패")
    );

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const checkbox = screen.getByLabelText("업종 사용 여부");

    fireEvent.click(checkbox);

    expect(await screen.findByText("item active 저장 실패")).toBeTruthy();
    expect(checkbox.checked).toBe(true);
    consoleError.mockRestore();
  });

  it("renders summary counts and representative base totals", async () => {
    await renderEnabledPage();

    fireEvent.click(screen.getByRole("button", { name: "검증 요약" }));

    const summary = screen.getByRole("region", {
      name: "표준공수 메타 검증 요약",
    });

    expect(within(summary).getAllByText("solution 수").length).toBeGreaterThan(0);
    expect(within(summary).getAllByText("coefficient row 수").length).toBeGreaterThan(0);
    expect(within(summary).getByText("Row Count")).toBeTruthy();
    expect(within(summary).getByText("coefficient expected matrix")).toBeTruthy();
    expect(within(summary).getByText("coefficient completeness")).toBeTruthy();
    expect(within(summary).getByText("에스원 fixture 산출 미리보기")).toBeTruthy();
    expect(within(summary).getAllByText("PBX").length).toBeGreaterThan(0);
    expect(within(summary).getAllByText("WFM").length).toBeGreaterThan(0);
    expect(within(summary).getAllByText("CTI v4").length).toBeGreaterThan(0);
    expect(within(summary).getAllByText("주의").length).toBeGreaterThan(0);
    expect(within(summary).getAllByText("변경됨").length).toBeGreaterThan(0);
    expect(within(summary).queryByRole("spinbutton")).toBeNull();
    expect(within(summary).queryByRole("button", { name: "저장" })).toBeNull();
  });

  it("keeps meta editing enabled in auth disabled mode", async () => {
    await renderEnabledPage();

    const baseInput = screen.getByLabelText("PBX 분석(M/M)");
    const activeToggle = screen.getByLabelText("PBX 사용 여부");

    expect(baseInput.disabled).toBe(false);
    expect(activeToggle.disabled).toBe(false);
  });

  it("disables base effort, coefficient, and active controls without write permissions", async () => {
    await renderDevPermissionPage();

    expect(
      screen.getByText(/표준공수 메타를 조회할 수 있지만 일부 수정 권한/)
    ).toBeTruthy();

    const baseInput = screen.getByLabelText("PBX 분석(M/M)");
    const baseRow = baseInput.closest("tr");
    const activeToggle = screen.getByLabelText("PBX 사용 여부");

    expect(baseInput.disabled).toBe(true);
    expect(activeToggle.disabled).toBe(true);
    expect(
      within(baseRow).getByRole("button", { name: "저장" }).disabled
    ).toBe(true);

    fireEvent.change(baseInput, { target: { value: "2.5" } });
    fireEvent.click(activeToggle);
    expect(repositoryMocks.upsertStandardBaseEffortRows).not.toHaveBeenCalled();
    expect(
      repositoryMocks.updateStandardSolutionVariantActive
    ).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const coefficientInput = screen.getByLabelText("업종 PBX 계수");
    const itemActiveToggle = screen.getByLabelText("업종 사용 여부");
    const coefficientRow = coefficientInput.closest("tr");

    expect(coefficientInput.disabled).toBe(true);
    expect(itemActiveToggle.disabled).toBe(true);
    expect(
      within(coefficientRow).getByRole("button", { name: "저장" }).disabled
    ).toBe(true);

    fireEvent.change(coefficientInput, { target: { value: "0.75" } });
    fireEvent.click(itemActiveToggle);
    expect(
      repositoryMocks.upsertStandardCoefficientRows
    ).not.toHaveBeenCalled();
    expect(repositoryMocks.updateStandardItemActive).not.toHaveBeenCalled();
  });

  it("enables only base effort editing with base effort write permission", async () => {
    await renderDevPermissionPage([
      PERMISSIONS.STANDARD_EFFORT_META_BASE_EFFORT_WRITE,
    ]);

    const baseInput = screen.getByLabelText("PBX 분석(M/M)");
    const baseRow = baseInput.closest("tr");

    expect(baseInput.disabled).toBe(false);
    expect(screen.getByLabelText("PBX 사용 여부").disabled).toBe(true);

    fireEvent.change(baseInput, { target: { value: "2.5" } });
    expect(
      within(baseRow).getByRole("button", { name: "저장" }).disabled
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));
    expect(screen.getByLabelText("업종 PBX 계수").disabled).toBe(true);
  });

  it("enables only coefficient editing with coefficient write permission", async () => {
    await renderDevPermissionPage([
      PERMISSIONS.STANDARD_EFFORT_META_COEFFICIENT_WRITE,
    ]);

    expect(screen.getByLabelText("PBX 분석(M/M)").disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    const coefficientInput = screen.getByLabelText("업종 PBX 계수");
    const coefficientRow = coefficientInput.closest("tr");

    expect(coefficientInput.disabled).toBe(false);
    expect(screen.getByLabelText("업종 사용 여부").disabled).toBe(true);

    fireEvent.change(coefficientInput, { target: { value: "0.75" } });
    expect(
      within(coefficientRow).getByRole("button", { name: "저장" }).disabled
    ).toBe(false);
  });

  it("enables only active toggles with active write permission", async () => {
    await renderDevPermissionPage([
      PERMISSIONS.STANDARD_EFFORT_META_ACTIVE_WRITE,
    ]);

    expect(screen.getByLabelText("PBX 분석(M/M)").disabled).toBe(true);
    expect(screen.getByLabelText("PBX 사용 여부").disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "기능항목/계수" }));

    expect(screen.getByLabelText("업종 PBX 계수").disabled).toBe(true);
    expect(screen.getByLabelText("업종 사용 여부").disabled).toBe(false);
  });
});
