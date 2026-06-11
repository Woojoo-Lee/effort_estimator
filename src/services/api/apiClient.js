import { normalizeApiError } from "./apiErrors";
import {
  buildApiHeaders,
  buildApiUrl,
  createRequestId,
  parseApiResponse,
} from "./apiRequest";

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function resolveFetchImpl(fetchImpl) {
  const resolvedFetch = fetchImpl || globalThis.fetch;

  if (!resolvedFetch) {
    throw new Error("fetch implementation is not available.");
  }

  return resolvedFetch;
}

function buildRequestBody(body) {
  if (body === undefined) {
    return undefined;
  }

  if (isFormData(body)) {
    return body;
  }

  if (isPlainObject(body) || Array.isArray(body)) {
    return JSON.stringify(body);
  }

  return body;
}

function shouldRemoveContentType(body, headers = {}, explicitHeaders = {}) {
  return (
    isFormData(body) &&
    headers["Content-Type"] === "application/json" &&
    !("Content-Type" in explicitHeaders) &&
    !("content-type" in explicitHeaders)
  );
}

export function createApiClient(config = {}) {
  const {
    baseUrl,
    getAuthToken,
    fetchImpl,
    defaultHeaders = {},
    onRequest,
    onResponse,
    onError,
  } = config;
  const normalizedBaseUrl = String(baseUrl || "").trim();

  if (!normalizedBaseUrl) {
    throw new Error("API baseUrl is required.");
  }

  const request = async (path, options = {}) => {
    const resolvedFetch = resolveFetchImpl(fetchImpl);
    const method = String(options.method || "GET").toUpperCase();
    const requestId = options.requestId || createRequestId();
    const authToken =
      options.authToken ??
      (typeof getAuthToken === "function" ? await getAuthToken() : null);
    const explicitHeaders = options.headers || {};
    const headers = buildApiHeaders({
      requestId,
      authToken,
      headers: {
        ...defaultHeaders,
        ...explicitHeaders,
      },
    });
    const body = buildRequestBody(options.body);

    if (shouldRemoveContentType(options.body, headers, explicitHeaders)) {
      delete headers["Content-Type"];
    }

    const url = buildApiUrl(normalizedBaseUrl, path, options.query);
    const fetchOptions = {
      method,
      headers,
      signal: options.signal,
      ...(body === undefined ? {} : { body }),
    };

    try {
      onRequest?.({ url, options: fetchOptions, requestId });
      const response = await resolvedFetch(url, fetchOptions);

      onResponse?.({ url, options: fetchOptions, response, requestId });
      return await parseApiResponse(response);
    } catch (error) {
      const apiError = normalizeApiError(error);

      onError?.({ url, options: fetchOptions, error: apiError, requestId });
      throw apiError;
    }
  };

  return {
    request,
    get: (path, options = {}) => request(path, { ...options, method: "GET" }),
    post: (path, options = {}) => request(path, { ...options, method: "POST" }),
    put: (path, options = {}) => request(path, { ...options, method: "PUT" }),
    patch: (path, options = {}) =>
      request(path, { ...options, method: "PATCH" }),
    delete: (path, options = {}) =>
      request(path, { ...options, method: "DELETE" }),
  };
}
