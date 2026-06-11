import { afterEach, describe, expect, it, vi } from "vitest";

import * as exportApiAdapter from "../src/services/adapters/api/exportApiAdapter";
import {
  assertRepositoryContract,
  EXPORT_REPOSITORY_METHODS,
  REPOSITORY_CONTRACTS,
  selectExportAdapter,
} from "../src/services/adapters";
import * as exportLocalAdapter from "../src/services/adapters/local/exportLocalAdapter";
import * as exportRepository from "../src/services/exportRepository";

function createAdapter(name) {
  return EXPORT_REPOSITORY_METHODS.reduce((adapter, methodName) => {
    adapter[methodName] = vi.fn((...args) => ({
      data: { adapter: name, args },
      error: null,
    }));
    return adapter;
  }, {});
}

describe("export repository adapter boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the export repository facade exports", () => {
    EXPORT_REPOSITORY_METHODS.forEach((methodName) => {
      expect(typeof exportRepository[methodName]).toBe("function");
    });
  });

  it("defines the export repository contract", () => {
    expect(EXPORT_REPOSITORY_METHODS).toEqual([
      "fetchStandardEffortExportData",
      "fetchLegacyExportData",
      "downloadStandardEffortExport",
      "downloadLegacyExport",
    ]);
    expect(REPOSITORY_CONTRACTS.export).toBe(EXPORT_REPOSITORY_METHODS);
  });

  it("selects the local adapter by default", () => {
    const localAdapter = createAdapter("local");
    const apiAdapter = createAdapter("api");

    expect(
      selectExportAdapter({
        env: {},
        localAdapter,
        apiAdapter,
      })
    ).toBe(localAdapter);
  });

  it("selects the local adapter in explicit supabase mode", () => {
    const localAdapter = createAdapter("local");
    const apiAdapter = createAdapter("api");

    expect(
      selectExportAdapter({
        env: { VITE_DATA_BACKEND: "supabase" },
        localAdapter,
        apiAdapter,
      })
    ).toBe(localAdapter);
  });

  it("selects the API adapter in api mode", () => {
    const localAdapter = createAdapter("local");
    const apiAdapter = createAdapter("api");

    expect(
      selectExportAdapter({
        env: { VITE_DATA_BACKEND: "api" },
        localAdapter,
        apiAdapter,
      })
    ).toBe(apiAdapter);
  });

  it("falls back unknown backend values to the local adapter", () => {
    const localAdapter = createAdapter("local");
    const apiAdapter = createAdapter("api");

    expect(
      selectExportAdapter({
        env: { VITE_DATA_BACKEND: "unknown" },
        localAdapter,
        apiAdapter,
      })
    ).toBe(localAdapter);
  });

  it("validates both export adapters against the contract", () => {
    expect(
      assertRepositoryContract(
        exportLocalAdapter,
        EXPORT_REPOSITORY_METHODS,
        "exportLocalAdapter"
      )
    ).toBe(true);
    expect(
      assertRepositoryContract(
        exportApiAdapter,
        EXPORT_REPOSITORY_METHODS,
        "exportApiAdapter"
      )
    ).toBe(true);
  });

  it("local adapter stubs return the existing repository result surface", async () => {
    const result = await exportLocalAdapter.fetchStandardEffortExportData("42");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "export local adapter method fetchStandardEffortExportData is not connected yet. Existing frontend export still uses useExportManager."
    );
  });

  it("API adapter stubs keep legacy export unimplemented", async () => {
    const result = await exportApiAdapter.fetchLegacyExportData("42");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(
      "export API adapter method fetchLegacyExportData is not implemented yet."
    );
  });

  it("facade uses the local adapter stub by default", async () => {
    const result = await exportRepository.fetchLegacyExportData("42");

    expect(result.data).toBeNull();
    expect(result.error.message).toBe(
      "export local adapter method fetchLegacyExportData is not connected yet. Existing frontend export still uses useExportManager."
    );
  });

  it("facade uses the API adapter stub in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");

    const result = await exportRepository.downloadStandardEffortExport("42");

    expect(result.data).toBeNull();
    expect(result.error.message).toBe(
      "export API adapter method downloadStandardEffortExport is not implemented yet."
    );
  });

  it("facade uses the API adapter standard effort export-data path in api mode", async () => {
    vi.stubEnv("VITE_DATA_BACKEND", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              project: { id: "42" },
              standard_effort: {
                results: [{ solution_variant_id: "variant-1" }],
                totals: {},
              },
            },
          }),
        headers: { get: () => null },
      })
    );
    vi.stubGlobal("fetch", fetchImpl);

    const result = await exportRepository.fetchStandardEffortExportData("42");

    expect(result.error).toBeNull();
    expect(result.data.project).toEqual({ id: "42" });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects/42/standard-effort/export-data"
    );
  });

  it("keeps project ids as caller-provided numbers or strings at the adapter boundary", () => {
    const apiAdapter = createAdapter("api");
    const selected = selectExportAdapter({
      env: { VITE_DATA_BACKEND: "api" },
      localAdapter: createAdapter("local"),
      apiAdapter,
    });

    selected.fetchStandardEffortExportData("00000042", { format: "xlsx" });
    selected.fetchLegacyExportData(42, { format: "json" });

    expect(apiAdapter.fetchStandardEffortExportData).toHaveBeenCalledWith(
      "00000042",
      { format: "xlsx" }
    );
    expect(apiAdapter.fetchLegacyExportData).toHaveBeenCalledWith(42, {
      format: "json",
    });
  });
});
