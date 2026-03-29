export function buildProjectExportPayload({ projectState, calcState }) {
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      formatVersion: 1,
      app: "contact-center-effort-estimator",
    },
    project: {
      projectName: projectState.projectName,
      activeTab: projectState.activeTab,
      itemsBySolution: projectState.itemsBySolution,
      scaleFactor: projectState.scaleFactor,
      riskFactor: projectState.riskFactor,
      mgmtRate: projectState.mgmtRate,
      savedAt: projectState.savedAt,
    },
    totals: {
      solutionTotals: calcState.solutionTotals,
      grandBaseTotal: calcState.grandBaseTotal,
      scaledTotal: calcState.scaledTotal,
      riskAppliedTotal: calcState.riskAppliedTotal,
      mgmtMd: calcState.mgmtMd,
      finalTotal: calcState.finalTotal,
    },
  };
}