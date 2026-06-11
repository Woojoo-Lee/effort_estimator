import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "../src/services/api";

function createResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
    headers: {
      get: () => null,
    },
  };
}

describe("API client skeleton", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetchImpl for requests", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(createResponse({ ok: true, data: { project_id: 42 } }))
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

    await expect(client.get("/projects/42")).resolves.toEqual({
      project_id: 42,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/projects/42",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("passes GET query parameters", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(createResponse({ ok: true, data: [] }))
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com/",
      fetchImpl,
    });

    await client.get("/projects", {
      query: {
        status: "open",
      },
    });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.example.com/projects?status=open"
    );
  });

  it("stringifies plain object bodies and keeps snake_case keys", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(createResponse({ ok: true, data: {} }))
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

    await client.post("/projects/42/standard-effort/actual-effort", {
      body: {
        project_id: 42,
        actual_effort_mm: 3.5,
      },
      requestId: "request-1",
    });

    expect(fetchImpl.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          project_id: 42,
          actual_effort_mm: 3.5,
        }),
      })
    );
  });

  it("does not stringify FormData bodies", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(createResponse({ ok: true, data: {} }))
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });
    const formData = new FormData();

    formData.append("file", "content");
    await client.post("/upload", { body: formData });

    expect(fetchImpl.mock.calls[0][1].body).toBe(formData);
    expect(fetchImpl.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
  });

  it("adds Authorization from getAuthToken and request id header", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(createResponse({ ok: true, data: {} }))
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
      getAuthToken: () => "auth-token",
    });

    await client.get("/me", { requestId: "request-1" });

    expect(fetchImpl.mock.calls[0][1].headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer auth-token",
        "X-Request-Id": "request-1",
      })
    );
  });

  it("calls request and response hooks", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(createResponse({ ok: true, data: { ok: "yes" } }))
    );
    const onRequest = vi.fn();
    const onResponse = vi.fn();
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
      onRequest,
      onResponse,
    });

    await client.put("/resource", { requestId: "request-1" });

    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "request-1" })
    );
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "request-1" })
    );
  });

  it("normalizes fetch errors and calls onError", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error("network down")));
    const onError = vi.fn();
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
      onError,
    });

    await expect(client.get("/projects")).rejects.toMatchObject({
      name: "ApiError",
      message: "network down",
    });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ name: "ApiError" }),
      })
    );
  });

  it("requires baseUrl", () => {
    expect(() => createApiClient()).toThrow("API baseUrl is required.");
  });

  it("throws when no fetch implementation is available", async () => {
    vi.stubGlobal("fetch", undefined);
    const client = createApiClient({ baseUrl: "https://api.example.com" });

    await expect(client.get("/projects")).rejects.toThrow(
      "fetch implementation is not available."
    );
  });
});
