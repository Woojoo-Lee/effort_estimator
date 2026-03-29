export function mapEstimatorToExcelRows({ projectState, calcState }) {
  const rows = [];

  const solutionKeys = Object.keys(projectState.itemsBySolution || {});

  solutionKeys.forEach((solutionKey) => {
    const items = projectState.itemsBySolution[solutionKey] || [];

    items.forEach((item, index) => {
      rows.push({
        솔루션: solutionKey,
        순번: index + 1,
        업무명: item.name ?? "",
        기본MD: Number(item.baseMd ?? 0),
        난이도: Number(item.difficulty ?? 0),
        복잡도: Number(item.complexity ?? 0),
        비고: item.note ?? "",
      });
    });
  });

  rows.push({});
  rows.push({
    솔루션: "합계",
    업무명: "Grand Base Total",
    기본MD: Number(calcState.grandBaseTotal ?? 0),
  });
  rows.push({
    솔루션: "합계",
    업무명: "Scale Applied",
    기본MD: Number(calcState.scaledTotal ?? 0),
  });
  rows.push({
    솔루션: "합계",
    업무명: "Risk Applied",
    기본MD: Number(calcState.riskAppliedTotal ?? 0),
  });
  rows.push({
    솔루션: "합계",
    업무명: "Management MD",
    기본MD: Number(calcState.mgmtMd ?? 0),
  });
  rows.push({
    솔루션: "합계",
    업무명: "Final Total",
    기본MD: Number(calcState.finalTotal ?? 0),
  });

  return rows;
}