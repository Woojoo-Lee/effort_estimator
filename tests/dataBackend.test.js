import { describe, expect, it } from "vitest";

import {
  DATA_BACKENDS,
  getApiBaseUrl,
  isApiBackend,
  isSupabaseBackend,
  resolveDataBackend,
  validateDataBackendConfig,
} from "../src/services/dataBackend";

describe("data backend resolver", () => {
  it("uses supabase when env is empty", () => {
    const config = resolveDataBackend({});

    expect(config.backend).toBe(DATA_BACKENDS.SUPABASE);
    expect(config.isFallback).toBe(false);
    expect(config.apiBaseUrl).toBeNull();
  });

  it("resolves supabase mode", () => {
    const config = resolveDataBackend({ VITE_DATA_BACKEND: "supabase" });

    expect(config.backend).toBe(DATA_BACKENDS.SUPABASE);
    expect(isSupabaseBackend(config)).toBe(true);
    expect(isApiBackend(config)).toBe(false);
  });

  it("resolves api mode", () => {
    const config = resolveDataBackend({
      VITE_DATA_BACKEND: "api",
      VITE_API_BASE_URL: "https://api.example.com",
    });

    expect(config.backend).toBe(DATA_BACKENDS.API);
    expect(config.apiBaseUrl).toBe("https://api.example.com");
    expect(isApiBackend(config)).toBe(true);
  });

  it("normalizes case and whitespace", () => {
    const config = resolveDataBackend({
      VITE_DATA_BACKEND: "  API  ",
      VITE_API_BASE_URL: " https://api.example.com/ ",
    });

    expect(config.backend).toBe(DATA_BACKENDS.API);
    expect(config.apiBaseUrl).toBe("https://api.example.com");
  });

  it("falls back to supabase for unknown values", () => {
    const config = resolveDataBackend({ VITE_DATA_BACKEND: "unknown" });

    expect(config.backend).toBe(DATA_BACKENDS.SUPABASE);
    expect(config.rawBackend).toBe("unknown");
    expect(config.isFallback).toBe(true);
    expect(config.warnings.length).toBeGreaterThan(0);
  });

  it("removes trailing slashes from API base URL", () => {
    expect(
      getApiBaseUrl({ VITE_API_BASE_URL: "https://api.example.com///" })
    ).toBe("https://api.example.com");
  });

  it("marks api mode invalid when API base URL is missing", () => {
    const validation = validateDataBackendConfig({ VITE_DATA_BACKEND: "api" });

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain(
      "VITE_API_BASE_URL is required when VITE_DATA_BACKEND=api."
    );
  });

  it("marks supabase mode valid without API base URL", () => {
    const validation = validateDataBackendConfig({
      VITE_DATA_BACKEND: "supabase",
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("does not throw for unknown backend values", () => {
    expect(() =>
      validateDataBackendConfig({ VITE_DATA_BACKEND: "something-else" })
    ).not.toThrow();
  });
});
