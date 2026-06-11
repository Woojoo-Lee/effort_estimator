const DEFAULT_XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DEFAULT_DOWNLOAD_FILENAME = "download.xlsx";
const DEFAULT_WORKBOOK_FILENAME = "standard_effort.xlsx";

function toError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }

  return new Error(fallbackMessage);
}

function resolveBlobConstructor(options = {}) {
  const BlobConstructor = Object.prototype.hasOwnProperty.call(options, "Blob")
    ? options.Blob
    : globalThis.Blob;

  if (typeof BlobConstructor !== "function") {
    throw new Error("Blob is not available in this environment.");
  }

  return BlobConstructor;
}

function resolveUrlApi(deps = {}) {
  return Object.prototype.hasOwnProperty.call(deps, "URL")
    ? deps.URL
    : globalThis.URL;
}

function resolveDocument(deps = {}) {
  return Object.prototype.hasOwnProperty.call(deps, "document")
    ? deps.document
    : globalThis.document;
}

function isMissingData(data) {
  return data === null || data === undefined;
}

export function createDownloadBlob(data, options = {}) {
  if (isMissingData(data)) {
    throw new Error("Download data is required.");
  }

  const BlobConstructor = resolveBlobConstructor(options);
  const mimeType = options.mimeType || DEFAULT_XLSX_MIME_TYPE;

  if (data instanceof BlobConstructor) {
    return data;
  }

  return new BlobConstructor([data], { type: mimeType });
}

export function createObjectUrl(blob, deps = {}) {
  const URLApi = resolveUrlApi(deps);

  if (!URLApi || typeof URLApi.createObjectURL !== "function") {
    throw new Error("URL.createObjectURL is not available.");
  }

  return URLApi.createObjectURL(blob);
}

export function revokeObjectUrl(url, deps = {}) {
  if (!url) {
    return;
  }

  const URLApi = resolveUrlApi(deps);

  if (URLApi && typeof URLApi.revokeObjectURL === "function") {
    URLApi.revokeObjectURL(url);
  }
}

export function triggerBrowserDownload({ url, filename } = {}, deps = {}) {
  if (!url) {
    throw new Error("Download URL is required.");
  }

  const documentRef = resolveDocument(deps);

  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new Error("document.createElement is not available.");
  }

  if (!documentRef.body || typeof documentRef.body.appendChild !== "function") {
    throw new Error("document.body.appendChild is not available.");
  }

  const anchor = documentRef.createElement("a");
  anchor.href = url;
  anchor.download = filename || DEFAULT_DOWNLOAD_FILENAME;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  documentRef.body.appendChild(anchor);
  anchor.click();

  if (typeof anchor.remove === "function") {
    anchor.remove();
  } else if (
    anchor.parentNode &&
    typeof anchor.parentNode.removeChild === "function"
  ) {
    anchor.parentNode.removeChild(anchor);
  } else if (typeof documentRef.body.removeChild === "function") {
    documentRef.body.removeChild(anchor);
  }

  return {
    ok: true,
    filename: anchor.download,
  };
}

export function downloadBlobAsFile(blob, filename, deps = {}) {
  let url;
  const downloadFilename = filename || DEFAULT_DOWNLOAD_FILENAME;

  try {
    url = createObjectUrl(blob, deps);
    triggerBrowserDownload({ url, filename: downloadFilename }, deps);

    return {
      ok: true,
      filename: downloadFilename,
    };
  } catch (error) {
    return {
      ok: false,
      error: toError(error, "Download failed."),
    };
  } finally {
    revokeObjectUrl(url, deps);
  }
}

export function downloadArrayBufferAsFile(
  buffer,
  filename,
  options = {},
  deps = {}
) {
  try {
    const blob = createDownloadBlob(buffer, options);

    return downloadBlobAsFile(blob, filename, deps);
  } catch (error) {
    return {
      ok: false,
      error: toError(error, "Download failed."),
    };
  }
}

export function downloadWorkbookOutput(workbookOutput, options = {}, deps = {}) {
  if (!workbookOutput || isMissingData(workbookOutput.buffer)) {
    return {
      ok: false,
      error: new Error("Workbook output buffer is required."),
    };
  }

  return downloadArrayBufferAsFile(
    workbookOutput.buffer,
    workbookOutput.filename || DEFAULT_WORKBOOK_FILENAME,
    options,
    deps
  );
}
