export function normalizeImportData(data) {
  const project = data?.project ?? {};

  return {
    projectName: project.projectName || "불러온 컨택센터 프로젝트",
    activeTab: project.activeTab || "pbx",
    itemsBySolution: project.itemsBySolution || {},
    scaleFactor: Number(project.scaleFactor ?? 1),
    riskFactor: Number(project.riskFactor ?? 1),
    mgmtRate: Number(project.mgmtRate ?? 10),
    savedAt: project.savedAt || "",
  };
}