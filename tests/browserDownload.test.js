import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  createDownloadBlob,
  createObjectUrl,
  downloadArrayBufferAsFile,
  downloadBlobAsFile,
  downloadWorkbookOutput,
  revokeObjectUrl,
  triggerBrowserDownload,
} from "../src/utils/export/browserDownload";

const DEFAULT_XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function createDocumentMock(callOrder = [], options = {}) {
  const anchor = {
    href: "",
    download: "",
    rel: "",
    style: {},
    click: vi.fn(() => {
      callOrder.push("click");
      if (options.throwOnClick) {
        throw new Error("click failed");
      }
    }),
    remove: vi.fn(() => callOrder.push("remove")),
  };
  const body = {
    appendChild: vi.fn((element) => {
      callOrder.push("append");
      element.parentNode = body;
      return element;
    }),
    removeChild: vi.fn((element) => {
      callOrder.push("removeChild");
      element.parentNode = null;
      return element;
    }),
  };
  const document = {
    body,
    createElement: vi.fn((tagName) => {
      callOrder.push(`create:${tagName}`);
      return anchor;
    }),
  };

  return { document, anchor, body };
}

function createUrlMock(callOrder = []) {
  return {
    createObjectURL: vi.fn(() => {
      callOrder.push("createObjectURL");
      return "blob:mock-url";
    }),
    revokeObjectURL: vi.fn((url) => {
      callOrder.push(`revoke:${url}`);
    }),
  };
}

function source() {
  return readFileSync(
    new URL("../src/utils/export/browserDownload.js", import.meta.url),
    "utf8"
  );
}

describe("browser download helpers", () => {
  it("creates a Blob from an ArrayBuffer", async () => {
    const blob = createDownloadBlob(new ArrayBuffer(3));

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(DEFAULT_XLSX_MIME_TYPE);
    expect(await blob.arrayBuffer()).toHaveProperty("byteLength", 3);
  });

  it("creates a Blob from a Uint8Array", async () => {
    const blob = createDownloadBlob(new Uint8Array([1, 2, 3]));
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(blob).toBeInstanceOf(Blob);
    expect([...bytes]).toEqual([1, 2, 3]);
  });

  it("creates a Blob from a string", async () => {
    const blob = createDownloadBlob("hello");

    expect(blob).toBeInstanceOf(Blob);
    expect(await blob.text()).toBe("hello");
  });

  it("uses a custom mime type", () => {
    const blob = createDownloadBlob("{}", { mimeType: "application/json" });

    expect(blob.type).toBe("application/json");
  });

  it("throws when download data is missing", () => {
    expect(() => createDownloadBlob(null)).toThrow(/data/i);
    expect(() => createDownloadBlob(undefined)).toThrow(/data/i);
  });

  it("creates an object URL through injected URL deps", () => {
    const URL = createUrlMock();
    const blob = createDownloadBlob("hello");

    expect(createObjectUrl(blob, { URL })).toBe("blob:mock-url");
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("throws when createObjectURL is unavailable", () => {
    expect(() => createObjectUrl(new Blob(["x"]), { URL: {} })).toThrow(
      /createObjectURL/
    );
  });

  it("revokes an object URL through injected URL deps", () => {
    const URL = createUrlMock();

    revokeObjectUrl("blob:mock-url", { URL });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("triggers browser download through an anchor element", () => {
    const { document, anchor, body } = createDocumentMock();

    const result = triggerBrowserDownload(
      { url: "blob:mock-url", filename: "report.xlsx" },
      { document }
    );

    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(anchor.href).toBe("blob:mock-url");
    expect(anchor.download).toBe("report.xlsx");
    expect(anchor.rel).toBe("noopener");
    expect(anchor.style.display).toBe("none");
    expect(body.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, filename: "report.xlsx" });
  });

  it("uses a filename fallback when triggering a download", () => {
    const { document, anchor } = createDocumentMock();

    const result = triggerBrowserDownload({ url: "blob:mock-url" }, { document });

    expect(anchor.download).toBe("download.xlsx");
    expect(result.filename).toBe("download.xlsx");
  });

  it("throws when document is unavailable", () => {
    expect(() =>
      triggerBrowserDownload(
        { url: "blob:mock-url", filename: "report.xlsx" },
        { document: null }
      )
    ).toThrow(/document/);
  });

  it("downloads a Blob as a file and revokes the object URL", () => {
    const callOrder = [];
    const URL = createUrlMock(callOrder);
    const { document } = createDocumentMock(callOrder);
    const blob = createDownloadBlob("hello");

    const result = downloadBlobAsFile(blob, "report.xlsx", { URL, document });

    expect(result).toEqual({ ok: true, filename: "report.xlsx" });
    expect(callOrder).toEqual([
      "createObjectURL",
      "create:a",
      "append",
      "click",
      "remove",
      "revoke:blob:mock-url",
    ]);
  });

  it("revokes the object URL when download click fails", () => {
    const callOrder = [];
    const URL = createUrlMock(callOrder);
    const { document } = createDocumentMock(callOrder, { throwOnClick: true });
    const blob = createDownloadBlob("hello");

    const result = downloadBlobAsFile(blob, "report.xlsx", { URL, document });

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(callOrder).toContain("revoke:blob:mock-url");
  });

  it("downloads an ArrayBuffer as a file", () => {
    const callOrder = [];
    const URL = createUrlMock(callOrder);
    const { document } = createDocumentMock(callOrder);

    const result = downloadArrayBufferAsFile(
      new Uint8Array([1, 2, 3]),
      "report.xlsx",
      {},
      { URL, document }
    );

    expect(result).toEqual({ ok: true, filename: "report.xlsx" });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("downloads workbook output with its buffer and filename", () => {
    const callOrder = [];
    const URL = createUrlMock(callOrder);
    const { document } = createDocumentMock(callOrder);

    const result = downloadWorkbookOutput(
      {
        buffer: new Uint8Array([1, 2, 3]),
        filename: "standard.xlsx",
      },
      {},
      { URL, document }
    );

    expect(result).toEqual({ ok: true, filename: "standard.xlsx" });
  });

  it("uses a filename fallback for workbook output", () => {
    const callOrder = [];
    const URL = createUrlMock(callOrder);
    const { document } = createDocumentMock(callOrder);

    const result = downloadWorkbookOutput(
      { buffer: new Uint8Array([1, 2, 3]) },
      {},
      { URL, document }
    );

    expect(result).toEqual({ ok: true, filename: "standard_effort.xlsx" });
  });

  it("returns ok false when workbook output has no buffer", () => {
    const result = downloadWorkbookOutput({ filename: "standard.xlsx" });

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain("buffer");
  });

  it("does not import workbook, API, repository, or audit modules", () => {
    const fileSource = source();

    expect(fileSource).not.toMatch(/from ["']xlsx["']/);
    expect(fileSource).not.toContain("exportRepository");
    expect(fileSource).not.toContain("standardEffortExportWorkflow");
    expect(fileSource).not.toContain("createAuditLog");
  });

  it("does not use direct window access or perform unit conversion", () => {
    const fileSource = source();

    expect(fileSource).not.toContain("window");
    expect(fileSource).not.toMatch(/M\/D/i);
    expect(fileSource).not.toContain("effort_md");
    expect(fileSource).not.toContain("actual_effort_md");
    expect(fileSource).not.toContain("base_md");
  });
});
