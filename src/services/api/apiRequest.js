import { createApiErrorFromResponse } from "./apiErrors";

function isObject(value) {
  return value !== null && typeof value === "object";
}

function isNonEmptyQueryValue(value) {
  return value !== null && value !== undefined;
}

function parseJsonText(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readResponsePayload(response) {
  if (!response) {
    return null;
  }

  if (typeof response.json === "function") {
    try {
      return await response.json();
    } catch {
      // Empty bodies often fail JSON parsing. Fall back to text if available.
    }
  }

  if (typeof response.text === "function") {
    return parseJsonText(await response.text());
  }

  return null;
}

function isHttpOk(response) {
  if (response?.ok === false) {
    return false;
  }

  if (typeof response?.status === "number") {
    return response.status >= 200 && response.status < 300;
  }

  return true;
}

export function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildApiUrl(baseUrl, path = "", query = {}) {
  const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  const normalizedPath = String(path || "").trim().replace(/^\/+/, "");
  const url = normalizedPath
    ? `${normalizedBaseUrl}/${normalizedPath}`
    : normalizedBaseUrl;
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (!isNonEmptyQueryValue(value)) {
      return;
    }

    if (Array.isArray(value)) {
      value
        .filter(isNonEmptyQueryValue)
        .forEach((item) => params.append(key, String(item)));
      return;
    }

    params.append(key, String(value));
  });

  const queryString = params.toString();

  return queryString ? `${url}?${queryString}` : url;
}

export function buildApiHeaders(options = {}) {
  const requestId = options.requestId || createRequestId();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Request-Id": requestId,
    ...(options.headers || {}),
  };
  const authToken = options.authToken;

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined || headers[key] === null) {
      delete headers[key];
    }
  });

  return headers;
}

export async function parseApiResponse(response) {
  const payload = await readResponsePayload(response);

  if (!isHttpOk(response)) {
    throw createApiErrorFromResponse(response, payload);
  }

  if (isObject(payload) && payload.ok === false) {
    throw createApiErrorFromResponse(response, payload);
  }

  if (isObject(payload) && payload.ok === true && "data" in payload) {
    return payload.data;
  }

  return payload;
}
