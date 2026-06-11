import { describe, expect, it } from "vitest";

import {
  ApiError,
  buildApiHeaders,
  buildApiUrl,
  createRequestId,
  parseApiResponse,
} from "../src/services/api";

function createResponse(payload, options = {}) {
  const {
    ok = true,
    status = ok ? 200 : 500,
    jsonRejects = false,
    text = "",
  } = options;

  return {
    ok,
    status,
    headers: {
      get: (name) => (name === "x-request-id" ? "response-request-id" : null),
    },
    json: jsonRejects
      ? () => Promise.reject(new Error("empty"))
      : () => Promise.resolve(payload),
    text: () => Promise.resolve(text),
  };
}

describe("API request helpers", () => {
  it("creates request ids", () => {
    expect(createRequestId()).toEqual(expect.any(String));
    expect(createRequestId().length).toBeGreaterThan(0);
  });

  it("builds URLs with slash normalization", () => {
    expect(buildApiUrl("https://api.example.com/", "/projects")).toBe(
      "https://api.example.com/projects"
    );
  });

  it("builds URLs with repeated query params and skips nullish values", () => {
    expect(
      buildApiUrl("https://api.example.com", "/projects", {
        status: ["open", "closed"],
        owner: "me",
        empty: null,
        missing: undefined,
      })
    ).toBe("https://api.example.com/projects?status=open&status=closed&owner=me");
  });

  it("builds standard JSON headers", () => {
    expect(buildApiHeaders({ requestId: "request-1" })).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Request-Id": "request-1",
    });
  });

  it("adds auth and merges extra headers", () => {
    expect(
      buildApiHeaders({
        requestId: "request-1",
        authToken: "token",
        headers: {
          "X-Feature": "standard-effort",
          Empty: undefined,
        },
      })
    ).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Request-Id": "request-1",
      Authorization: "Bearer token",
      "X-Feature": "standard-effort",
    });
  });

  it("parses ok=true wrapper data", async () => {
    await expect(
      parseApiResponse(createResponse({ ok: true, data: { project_id: 42 } }))
    ).resolves.toEqual({ project_id: 42 });
  });

  it("returns non-wrapper JSON as-is", async () => {
    await expect(
      parseApiResponse(createResponse({ project_id: 42 }))
    ).resolves.toEqual({ project_id: 42 });
  });

  it("throws ApiError for ok=false wrapper", async () => {
    await expect(
      parseApiResponse(
        createResponse({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied",
            request_id: "request-2",
          },
        })
      )
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "FORBIDDEN",
      requestId: "request-2",
    });
  });

  it("throws ApiError for non-2xx responses", async () => {
    await expect(
      parseApiResponse(
        createResponse(
          {
            error: {
              code: "NOT_FOUND",
              message: "Missing",
            },
          },
          { ok: false, status: 404 }
        )
      )
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("handles empty bodies", async () => {
    await expect(
      parseApiResponse(createResponse(null, { jsonRejects: true, text: "" }))
    ).resolves.toBeNull();
  });
});
