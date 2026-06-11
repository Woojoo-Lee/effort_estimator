import { describe, expect, it } from "vitest";

import {
  ApiError,
  createApiErrorFromResponse,
  isApiError,
  normalizeApiError,
} from "../src/services/api";

function createResponse(status = 500, requestId = "response-request-id") {
  return {
    status,
    headers: {
      get: (name) => (name === "x-request-id" ? requestId : null),
    },
  };
}

describe("API errors", () => {
  it("creates ApiError instances with structured fields", () => {
    const error = new ApiError({
      code: "FORBIDDEN",
      message: "No access",
      details: { scope: "project" },
      status: 403,
      requestId: "request-1",
    });

    expect(error.name).toBe("ApiError");
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("No access");
    expect(error.details).toEqual({ scope: "project" });
    expect(error.status).toBe(403);
    expect(error.requestId).toBe("request-1");
    expect(isApiError(error)).toBe(true);
  });

  it("normalizes strings, Error objects, and nullish values", () => {
    expect(normalizeApiError("failed").message).toBe("failed");
    expect(normalizeApiError(new Error("boom")).message).toBe("boom");
    expect(normalizeApiError(null).message).toBe("API request failed.");
  });

  it("returns ApiError inputs as-is", () => {
    const error = new ApiError({ code: "KNOWN", message: "Known" });

    expect(normalizeApiError(error)).toBe(error);
  });

  it("creates an ApiError from response payload fields", () => {
    const response = createResponse(403);
    const error = createApiErrorFromResponse(response, {
      error: {
        code: "FORBIDDEN",
        message: "Access denied",
        details: { permission: "project.write" },
        request_id: "payload-request-id",
      },
    });

    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("Access denied");
    expect(error.details).toEqual({ permission: "project.write" });
    expect(error.status).toBe(403);
    expect(error.requestId).toBe("payload-request-id");
    expect(error.response).toBe(response);
  });

  it("uses status-based fallback message and response request id", () => {
    const error = createApiErrorFromResponse(createResponse(404), {});

    expect(error.code).toBe("API_ERROR");
    expect(error.message).toBe("API resource was not found.");
    expect(error.requestId).toBe("response-request-id");
  });
});
