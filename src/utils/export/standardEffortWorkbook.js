import * as XLSX from "xlsx";

import {
  buildStandardEffortExportFilename,
  buildStandardEffortExportSheets,
} from "./standardEffortExportMapper";

const DEFAULT_SHEET_NAME = "Sheet1";
const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_NAME_CHARS = /[\\/?*:[\]]/g;
const DEFAULT_BOOK_TYPE = "xlsx";

function toSheetRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

function truncateSheetName(name) {
  return name.slice(0, MAX_SHEET_NAME_LENGTH);
}

function sanitizeSheetName(name) {
  const normalized = String(name || "")
    .replace(INVALID_SHEET_NAME_CHARS, "_")
    .trim();

  return truncateSheetName(normalized || DEFAULT_SHEET_NAME);
}

function makeUniqueSheetName(rawName, usedNames) {
  const baseName = sanitizeSheetName(rawName);
  let candidate = baseName;
  let suffixNumber = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = `_${suffixNumber}`;
    candidate = `${baseName.slice(
      0,
      MAX_SHEET_NAME_LENGTH - suffix.length
    )}${suffix}`;
    suffixNumber += 1;
  }

  usedNames.add(candidate.toLowerCase());

  return candidate;
}

function measureCellWidth(value) {
  return String(value ?? "").length;
}

function buildColumnWidths(rows) {
  if (!rows.length) {
    return undefined;
  }

  const fieldNames = Array.from(
    rows.reduce((fields, row) => {
      Object.keys(row || {}).forEach((fieldName) => fields.add(fieldName));
      return fields;
    }, new Set())
  );

  return fieldNames.map((fieldName) => {
    const maxContentWidth = rows.reduce(
      (maxWidth, row) => Math.max(maxWidth, measureCellWidth(row?.[fieldName])),
      measureCellWidth(fieldName)
    );

    return { wch: Math.min(Math.max(maxContentWidth + 2, 10), 40) };
  });
}

function createWorksheet(rows) {
  const worksheet = rows.length
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.aoa_to_sheet([]);
  const columnWidths = buildColumnWidths(rows);

  if (columnWidths) {
    worksheet["!cols"] = columnWidths;
  }

  return worksheet;
}

export function createWorkbookFromSheets(sheets, options = {}) {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set();
  const sheetModels = Array.isArray(sheets) ? sheets : [];

  sheetModels.forEach((sheet, index) => {
    const rows = toSheetRows(sheet?.rows);
    const defaultName = `${DEFAULT_SHEET_NAME}${index + 1}`;
    const sheetName = makeUniqueSheetName(sheet?.name || defaultName, usedNames);
    const worksheet = createWorksheet(rows);

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  if (options.workbookProps) {
    workbook.Props = { ...(workbook.Props || {}), ...options.workbookProps };
  }

  return workbook;
}

export function createStandardEffortWorkbook(exportData, options = {}) {
  return createWorkbookFromSheets(buildStandardEffortExportSheets(exportData), options);
}

export function writeWorkbookToArrayBuffer(workbook, options = {}) {
  return XLSX.write(workbook, {
    bookType: options.bookType || DEFAULT_BOOK_TYPE,
    ...options.writeOptions,
    type: "array",
  });
}

export function buildStandardEffortWorkbookOutput(exportData, options = {}) {
  const sheets = buildStandardEffortExportSheets(exportData);
  const workbook = createWorkbookFromSheets(sheets, options);
  const buffer = writeWorkbookToArrayBuffer(workbook, options);
  const filename = buildStandardEffortExportFilename(exportData, {
    ...options,
    format: DEFAULT_BOOK_TYPE,
  });

  return {
    workbook,
    buffer,
    filename,
    sheets,
  };
}
