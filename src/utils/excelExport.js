import { FILE_VERSION, SOLUTIONS } from "./constants";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cell(value, type = "String", styleId = "") {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function row(cells) {
  return `<Row>${cells.join("")}</Row>`;
}

const EXCEL_XML_HEADER = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DCEBFF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Section"><Font ss:Bold="1"/><Interior ss:Color="#EEF4FF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Number"><NumberFormat ss:Format="0.00"/></Style>
 </Styles>`;

export function toExportPayload({
  activeTab,
  projectName,
  itemsBySolution,
  scaleFactor,
  riskFactor,
  mgmtRate,
  savedAt,
}) {
  return {
    fileVersion: FILE_VERSION,
    activeTab,
    projectName,
    itemsBySolution,
    scaleFactor,
    riskFactor,
    mgmtRate,
    savedAt,
  };
}

export function buildExcelXml({
  projectName,
  activeTab,
  itemsBySolution,
  solutionTotals,
  grandBaseTotal,
  scaledTotal,
  riskAppliedTotal,
  mgmtRate,
  mgmtMd,
  finalTotal,
  scaleFactor,
  riskFactor,
  savedAt,
  calcItemMd,
}) {
  const summaryRows = [];
  summaryRows.push(row([cell("프로젝트명", "String", "Header"), cell(projectName)]));
  summaryRows.push(row([cell("현재 탭", "String", "Header"), cell(activeTab)]));
  summaryRows.push(row([cell("저장 시각", "String", "Header"), cell(savedAt || "-")]));
  summaryRows.push(row([cell("", "String"), cell("")]));
  summaryRows.push(
    row([cell("솔루션", "String", "Header"), cell("기본 산정 합계(MD)", "String", "Header")])
  );

  SOLUTIONS.filter((s) => s.key !== "summary").forEach((sol) => {
    summaryRows.push(row([cell(sol.label), cell(solutionTotals[sol.key] || 0, "Number", "Number")]));
  });

  summaryRows.push(row([cell("", "String"), cell("")]));
  summaryRows.push(row([cell("규모 계수", "String", "Header"), cell(scaleFactor, "Number", "Number")]));
  summaryRows.push(row([cell("리스크 계수", "String", "Header"), cell(riskFactor, "Number", "Number")]));
  summaryRows.push(row([cell("관리 비율(%)", "String", "Header"), cell(mgmtRate, "Number", "Number")]));
  summaryRows.push(row([cell("기본 산정 소계", "String", "Header"), cell(grandBaseTotal, "Number", "Number")]));
  summaryRows.push(row([cell("규모 반영", "String", "Header"), cell(scaledTotal, "Number", "Number")]));
  summaryRows.push(row([cell("리스크 반영", "String", "Header"), cell(riskAppliedTotal, "Number", "Number")]));
  summaryRows.push(row([cell("관리 공수", "String", "Header"), cell(mgmtMd, "Number", "Number")]));
  summaryRows.push(row([cell("최종 산출 공수", "String", "Header"), cell(finalTotal, "Number", "Number")]));

  const detailRows = [];
  Object.entries(itemsBySolution).forEach(([solutionKey, items]) => {
    const sol = SOLUTIONS.find((s) => s.key === solutionKey);

    detailRows.push(row([cell(sol?.label || solutionKey, "String", "Section")]));
    detailRows.push(
      row([
        cell("업무 기능", "String", "Header"),
        cell("기본공수(MD)", "String", "Header"),
        cell("난이도", "String", "Header"),
        cell("복잡도", "String", "Header"),
        cell("산정공수(MD)", "String", "Header"),
        cell("비고", "String", "Header"),
      ])
    );

    items.forEach((item) => {
      detailRows.push(
        row([
          cell(item.name),
          cell(item.baseMd, "Number", "Number"),
          cell(item.difficulty, "Number", "Number"),
          cell(item.complexity, "Number", "Number"),
          cell(calcItemMd(item), "Number", "Number"),
          cell(item.note || ""),
        ])
      );
    });

    detailRows.push(
      row([cell("소계", "String", "Header"), cell(solutionTotals[solutionKey] || 0, "Number", "Number")])
    );
    detailRows.push(row([cell("", "String")]));
  });

  return `${EXCEL_XML_HEADER}
 <Worksheet ss:Name="Summary">
  <Table>${summaryRows.join("")}</Table>
 </Worksheet>
 <Worksheet ss:Name="Details">
  <Table>${detailRows.join("")}</Table>
 </Worksheet>
</Workbook>`;
}

export function downloadExcelFile({ projectName, xml }) {
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeProjectName = (projectName || "contact-center-project").replace(
    /[\\/:*?"<>|]/g,
    "-"
  );

  link.href = url;
  link.download = `${safeProjectName}-effort-estimate.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}