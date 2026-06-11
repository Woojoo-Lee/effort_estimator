const DEFAULT_API_ERROR_CODE = "API_ERROR";
const DEFAULT_API_ERROR_MESSAGE = "API request failed.";

function getResponseRequestId(response) {
  return response?.headers?.get?.("x-request-id") || null;
}

function getStatusMessage(status) {
  if (status === 400) {
    return "Bad API request.";
  }

  if (status === 401) {
    return "Authentication is required.";
  }

  if (status === 403) {
    return "Access is denied.";
  }

  if (status === 404) {
    return "API resource was not found.";
  }

  if (status >= 500) {
    return "Server error occurred.";
  }

  return DEFAULT_API_ERROR_MESSAGE;
}

function normalizeFallback(fallback) {
  if (typeof fallback === "string") {
    return {
      code: DEFAULT_API_ERROR_CODE,
      message: fallback,
    };
  }

  return {
    code: fallback?.code || DEFAULT_API_ERROR_CODE,
    message: fallback?.message || DEFAULT_API_ERROR_MESSAGE,
  };
}

function getPayloadError(value = {}) {
  return value.error && typeof value.error === "object" ? value.error : value;
}

export class ApiError extends Error {
  constructor({
    code = DEFAULT_API_ERROR_CODE,
    message = DEFAULT_API_ERROR_MESSAGE,
    details = null,
    status = null,
    requestId = null,
    response = null,
    cause = null,
  } = {}) {
    super(message || DEFAULT_API_ERROR_MESSAGE);
    this.name = "ApiError";
    this.code = code || DEFAULT_API_ERROR_CODE;
    this.details = details ?? null;
    this.status = status ?? null;
    this.requestId = requestId ?? null;
    this.response = response ?? null;
    this.cause = cause ?? null;
  }
}

export function isApiError(error) {
  return error instanceof ApiError;
}

export function createApiErrorFromResponse(response, payload = {}) {
  const payloadError = getPayloadError(payload || {});
  const status = response?.status ?? null;
  const requestId =
    payloadError.request_id ||
    payload?.meta?.request_id ||
    getResponseRequestId(response);

  return new ApiError({
    code: payloadError.code || DEFAULT_API_ERROR_CODE,
    message: payloadError.message || getStatusMessage(status),
    details: payloadError.details ?? null,
    status,
    requestId,
    response,
  });
}

export function normalizeApiError(error, fallback) {
  if (isApiError(error)) {
    return error;
  }

  const fallbackError = normalizeFallback(fallback);

  if (error === null || error === undefined) {
    return new ApiError(fallbackError);
  }

  if (typeof error === "string") {
    return new ApiError({
      ...fallbackError,
      message: error || fallbackError.message,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      ...fallbackError,
      message: error.message || fallbackError.message,
      cause: error,
    });
  }

  if (typeof error === "object") {
    const payloadError = getPayloadError(error);

    return new ApiError({
      code: payloadError.code || fallbackError.code,
      message: payloadError.message || fallbackError.message,
      details: payloadError.details ?? null,
      status: error.status ?? null,
      requestId: payloadError.request_id || error.request_id || null,
      response: error.response ?? null,
      cause: error.cause ?? null,
    });
  }

  return new ApiError(fallbackError);
}
