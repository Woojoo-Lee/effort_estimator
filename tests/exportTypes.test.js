import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXPORT_FORMAT,
  EXPORT_FORMATS,
  EXPORT_MODES,
  EXPORT_TYPES,
  normalizeExportFormat,
  normalizeExportType,
} from "../src/services/export/exportTypes";

describe("export types", () => {
  it("defines export type constants", () => {
    expect(EXPORT_TYPES).toEqual({
      LEGACY: "legacy",
      STANDARD_EFFORT: "standard_effort",
      AUDIT: "audit",
      STANDARD_EFFORT_META: "standard_effort_meta",
    });
  });

  it("defines export format and mode constants", () => {
    expect(EXPORT_FORMATS).toEqual({
      JSON: "json",
      XLSX: "xlsx",
    });
    expect(EXPORT_MODES).toEqual({
      LOCAL: "local",
      API_JSON: "api_json",
      API_FILE: "api_file",
    });
    expect(DEFAULT_EXPORT_FORMAT).toBe("xlsx");
  });

  it.each([
    ["legacy", "legacy"],
    ["standard_effort", "standard_effort"],
    ["audit", "audit"],
    ["standard_effort_meta", "standard_effort_meta"],
    [" STANDARD_EFFORT ", "standard_effort"],
  ])("normalizes export type %s", (input, expected) => {
    expect(normalizeExportType(input)).toBe(expected);
  });

  it("throws for unknown export types", () => {
    expect(() => normalizeExportType("unknown")).toThrow(
      'Unknown export type "unknown".'
    );
  });

  it.each([null, undefined, ""])(
    "defaults empty export format %s to xlsx",
    (input) => {
      expect(normalizeExportFormat(input)).toBe("xlsx");
    }
  );

  it.each([
    ["json", "json"],
    ["xlsx", "xlsx"],
    [" JSON ", "json"],
    ["XLSX", "xlsx"],
  ])("normalizes export format %s", (input, expected) => {
    expect(normalizeExportFormat(input)).toBe(expected);
  });

  it("falls back unknown export formats to xlsx", () => {
    expect(normalizeExportFormat("csv")).toBe("xlsx");
  });

  it("does not perform M/M numeric conversion", () => {
    expect(normalizeExportType("standard_effort")).toBe("standard_effort");
    expect(normalizeExportFormat("json")).toBe("json");
  });
});
