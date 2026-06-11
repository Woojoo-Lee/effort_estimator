import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import xlsx from "xlsx";

export const DEFAULT_WORKBOOK_PATH =
  "docs/2026_표준공수표_0522_v4.xlsx";
export const DEFAULT_OUTPUT_PATH =
  "db/seeds/20260522201000_seed_standard_effort_meta.sql";
export const STANDARD_SHEET_NAME = "표준공수";

export const SOLUTION_VARIANTS = [
  {
    excelColumn: "E",
    solution_code: "pbx",
    solution_name: "PBX",
    variant_code: "avaya",
    variant_name: "Avaya",
    display_name: "PBX",
    display_order: 10,
  },
  {
    excelColumn: "F",
    solution_code: "sbc",
    solution_name: "SBC",
    variant_code: "default",
    variant_name: "Default",
    display_name: "SBC",
    display_order: 20,
  },
  {
    excelColumn: "G",
    solution_code: "cti",
    solution_name: "CTI",
    variant_code: "v5",
    variant_name: "v5",
    display_name: "CTI v5",
    display_order: 30,
  },
  {
    excelColumn: "H",
    solution_code: "cti",
    solution_name: "CTI",
    variant_code: "v4",
    variant_name: "v4",
    display_name: "CTI v4",
    display_order: 40,
  },
  {
    excelColumn: "I",
    solution_code: "cms",
    solution_name: "CMS",
    variant_code: "avaya",
    variant_name: "Avaya",
    display_name: "CMS",
    display_order: 50,
  },
  {
    excelColumn: "J",
    solution_code: "ivr",
    solution_name: "IVR",
    variant_code: "v3_1",
    variant_name: "3.1",
    display_name: "IVR 3.1",
    display_order: 60,
  },
  {
    excelColumn: "K",
    solution_code: "ivr",
    solution_name: "IVR",
    variant_code: "ep",
    variant_name: "EP",
    display_name: "IVR EP",
    display_order: 70,
  },
  {
    excelColumn: "L",
    solution_code: "oamp",
    solution_name: "OAMP",
    variant_code: "v3_5",
    variant_name: "3.5",
    display_name: "OAMP",
    display_order: 80,
  },
  {
    excelColumn: "M",
    solution_code: "callbot",
    solution_name: "CallBot",
    variant_code: "v3",
    variant_name: "3",
    display_name: "CallBot",
    display_order: 90,
  },
  {
    excelColumn: "N",
    solution_code: "stat",
    solution_name: "STAT",
    variant_code: "v2",
    variant_name: "2",
    display_name: "STAT",
    display_order: 100,
  },
  {
    excelColumn: "O",
    solution_code: "wfm",
    solution_name: "WFM",
    variant_code: "v4",
    variant_name: "4",
    display_name: "WFM",
    display_order: 110,
  },
];

export const PHASES = [
  {
    excelRow: 5,
    phase_code: "analysis",
    phase_name: "분석",
    display_order: 10,
  },
  {
    excelRow: 6,
    phase_code: "design",
    phase_name: "설계",
    display_order: 20,
  },
  {
    excelRow: 7,
    phase_code: "implementation",
    phase_name: "구현",
    display_order: 30,
  },
  {
    excelRow: 8,
    phase_code: "test",
    phase_name: "단위/통합테스트",
    display_order: 40,
  },
  {
    excelRow: 9,
    phase_code: "deployment",
    phase_name: "이행 및 모니터링",
    display_order: 50,
  },
];

export const S1_PROJECT_COLUMNS = [
  { excelColumn: "Q", solution_code: "pbx", variant_code: "avaya" },
  { excelColumn: "R", solution_code: "sbc", variant_code: "default" },
  { excelColumn: "S", solution_code: "cti", variant_code: "v4" },
  { excelColumn: "T", solution_code: "cms", variant_code: "avaya" },
  { excelColumn: "U", solution_code: "ivr", variant_code: "v3_1" },
  { excelColumn: "V", solution_code: "oamp", variant_code: "v3_5" },
  { excelColumn: "W", solution_code: "callbot", variant_code: "v3" },
  { excelColumn: "X", solution_code: "stat", variant_code: "v2" },
  { excelColumn: "Y", solution_code: "wfm", variant_code: "v4" },
];

function getWorksheet(workbookPath = DEFAULT_WORKBOOK_PATH) {
  const workbook = xlsx.readFile(workbookPath, {
    cellDates: false,
    cellFormula: false,
    cellNF: false,
    cellText: false,
  });
  const worksheet = workbook.Sheets[STANDARD_SHEET_NAME];

  if (!worksheet) {
    throw new Error(`Sheet not found: ${STANDARD_SHEET_NAME}`);
  }

  return worksheet;
}

function readCell(worksheet, address) {
  return worksheet[address]?.v ?? null;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function readNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const num = Number(value);

  return Number.isFinite(num) ? Number(num.toFixed(10)) : 0;
}

function variantKey(solutionCode, variantCode) {
  return `${solutionCode}:${variantCode}`;
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  const num = readNumber(value);

  return Number(num.toFixed(10)).toString();
}

function valuesList(rows) {
  return rows.map((row) => `  (${row.join(", ")})`).join(",\n");
}

export function buildStandardEffortSeedData(
  workbookPath = DEFAULT_WORKBOOK_PATH
) {
  const worksheet = getWorksheet(workbookPath);
  const solutionMap = new Map();

  SOLUTION_VARIANTS.forEach((variant) => {
    if (!solutionMap.has(variant.solution_code)) {
      solutionMap.set(variant.solution_code, {
        solution_code: variant.solution_code,
        solution_name: variant.solution_name,
        display_order: variant.display_order,
        active: true,
      });
    }
  });

  const solutionVariants = SOLUTION_VARIANTS.map((variant) => ({
    ...variant,
    active: true,
  }));

  const baseEffortRows = solutionVariants.flatMap((variant) =>
    PHASES.map((phase) => ({
      solution_code: variant.solution_code,
      variant_code: variant.variant_code,
      phase_code: phase.phase_code,
      phase_name: phase.phase_name,
      effort_mm: readNumber(
        readCell(worksheet, `${variant.excelColumn}${phase.excelRow}`)
      ),
      display_order: phase.display_order,
      active: true,
    }))
  );

  const itemRows = [];
  let currentCategory = "";
  let currentItemName = "";

  for (let row = 13; row <= 79; row += 1) {
    const nextCategory = normalizeText(readCell(worksheet, `B${row}`));
    const nextItemName = normalizeText(readCell(worksheet, `C${row}`));

    if (nextCategory) {
      currentCategory = nextCategory;
    }

    if (nextItemName) {
      currentItemName = nextItemName;
    }

    itemRows.push({
      item_id: `excel-row-${row}`,
      excel_row_no: row,
      category_l1: currentCategory,
      category_l2: null,
      item_name: currentItemName,
      item_option: normalizeText(readCell(worksheet, `D${row}`)) || null,
      display_order: row,
      active: true,
    });
  }

  const coefficientRows = itemRows.flatMap((item) =>
    solutionVariants.map((variant) => ({
      item_id: item.item_id,
      excel_row_no: item.excel_row_no,
      category_l1: item.category_l1,
      category_l2: item.category_l2,
      item_name: item.item_name,
      item_option: item.item_option,
      solution_code: variant.solution_code,
      variant_code: variant.variant_code,
      coefficient: readNumber(
        readCell(worksheet, `${variant.excelColumn}${item.excel_row_no}`)
      ),
      active: true,
    }))
  );

  return {
    solutions: [...solutionMap.values()],
    solutionVariants,
    baseEffortRows,
    itemRows,
    coefficientRows,
  };
}

export function buildS1FixtureInput(workbookPath = DEFAULT_WORKBOOK_PATH) {
  const worksheet = getWorksheet(workbookPath);
  const seedData = buildStandardEffortSeedData(workbookPath);
  const variantByKey = new Map(
    seedData.solutionVariants.map((variant) => [
      variantKey(variant.solution_code, variant.variant_code),
      {
        solution_variant_id: variantKey(
          variant.solution_code,
          variant.variant_code
        ),
        solution_code: variant.solution_code,
        solution_name: variant.solution_name,
        variant_code: variant.variant_code,
        variant_name: variant.variant_name,
        display_name: variant.display_name,
        display_order: variant.display_order,
        active: true,
      },
    ])
  );
  const enabledProjectColumns = S1_PROJECT_COLUMNS.filter(
    (column) => readNumber(readCell(worksheet, `${column.excelColumn}10`)) > 0
  );
  const enabledKeys = new Set(
    enabledProjectColumns.map((column) =>
      variantKey(column.solution_code, column.variant_code)
    )
  );

  return {
    projectId: "s1-fixture",
    solutionVariants: [...variantByKey.values()],
    baseEffortRows: seedData.baseEffortRows.map((row) => ({
      solution_variant_id: variantKey(row.solution_code, row.variant_code),
      phase_code: row.phase_code,
      phase_name: row.phase_name,
      effort_mm: row.effort_mm,
      display_order: row.display_order,
      active: true,
    })),
    itemRows: seedData.itemRows.map((row) => ({
      item_id: row.item_id,
      excel_row_no: row.excel_row_no,
      category_l1: row.category_l1,
      category_l2: row.category_l2,
      item_name: row.item_name,
      item_option: row.item_option,
      display_order: row.display_order,
      active: true,
    })),
    coefficientRows: seedData.coefficientRows.map((row) => ({
      item_id: row.item_id,
      solution_variant_id: variantKey(row.solution_code, row.variant_code),
      coefficient: row.coefficient,
      active: true,
    })),
    projectSolutionSelections: enabledProjectColumns.map((column) => ({
      project_id: "s1-fixture",
      solution_variant_id: variantKey(column.solution_code, column.variant_code),
      enabled: true,
      actual_effort_mm: readNumber(
        readCell(worksheet, `${column.excelColumn}11`)
      ),
    })),
    projectItemSelections: seedData.itemRows.flatMap((item) =>
      S1_PROJECT_COLUMNS.filter((column) =>
        enabledKeys.has(variantKey(column.solution_code, column.variant_code))
      )
        .filter(
          (column) =>
            readNumber(readCell(worksheet, `${column.excelColumn}${item.excel_row_no}`)) ===
            1
        )
        .map((column) => ({
          project_id: "s1-fixture",
          solution_variant_id: variantKey(
            column.solution_code,
            column.variant_code
          ),
          item_id: item.item_id,
          checked: true,
        }))
    ),
  };
}

export function buildSeedSql(seedData = buildStandardEffortSeedData()) {
  const solutionValues = seedData.solutions.map((row) => [
    sqlString(row.solution_code),
    sqlString(row.solution_name),
    sqlNumber(row.display_order),
  ]);
  const variantValues = seedData.solutionVariants.map((row) => [
    sqlString(row.solution_code),
    sqlString(row.variant_code),
    sqlString(row.variant_name),
    sqlString(row.display_name),
    sqlNumber(row.display_order),
  ]);
  const baseEffortValues = seedData.baseEffortRows.map((row) => [
    sqlString(row.solution_code),
    sqlString(row.variant_code),
    sqlString(row.phase_code),
    sqlString(row.phase_name),
    sqlNumber(row.effort_mm),
    sqlNumber(row.display_order),
  ]);
  const itemValues = seedData.itemRows.map((row) => [
    sqlNumber(row.excel_row_no),
    sqlString(row.category_l1),
    sqlString(row.category_l2),
    sqlString(row.item_name),
    sqlString(row.item_option),
    sqlNumber(row.display_order),
  ]);
  const coefficientValues = seedData.coefficientRows.map((row) => [
    sqlNumber(row.excel_row_no),
    sqlString(row.category_l1),
    sqlString(row.category_l2),
    sqlString(row.item_name),
    sqlString(row.item_option),
    sqlString(row.solution_code),
    sqlString(row.variant_code),
    sqlNumber(row.coefficient),
  ]);

  return `-- Seed standard effort metadata from docs/2026_표준공수표_0522_v4.xlsx.
-- Source sheet: 표준공수, range A1:CN79. Project simulation columns are not seeded.

BEGIN;

WITH solution_seed (solution_code, solution_name, display_order) AS (
VALUES
${valuesList(solutionValues)}
)
INSERT INTO public.estimation_solution (
  solution_code,
  solution_name,
  display_order,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  solution_code,
  solution_name,
  display_order,
  true,
  now(),
  now(),
  NULL,
  NULL
FROM solution_seed
ON CONFLICT (solution_code)
DO UPDATE SET
  solution_name = EXCLUDED.solution_name,
  display_order = EXCLUDED.display_order,
  active = true,
  updated_at = now(),
  updated_by = NULL;

WITH variant_seed (
  solution_code,
  variant_code,
  variant_name,
  display_name,
  display_order
) AS (
VALUES
${valuesList(variantValues)}
)
INSERT INTO public.estimation_solution_variant (
  solution_code,
  variant_code,
  variant_name,
  display_name,
  display_order,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  solution_code,
  variant_code,
  variant_name,
  display_name,
  display_order,
  true,
  now(),
  now(),
  NULL,
  NULL
FROM variant_seed
ON CONFLICT (solution_code, variant_code)
DO UPDATE SET
  variant_name = EXCLUDED.variant_name,
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  active = true,
  updated_at = now(),
  updated_by = NULL;

WITH base_effort_seed (
  solution_code,
  variant_code,
  phase_code,
  phase_name,
  effort_mm,
  display_order
) AS (
VALUES
${valuesList(baseEffortValues)}
)
INSERT INTO public.estimation_standard_base_effort_meta (
  solution_variant_id,
  phase_code,
  phase_name,
  effort_mm,
  display_order,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  variant.solution_variant_id,
  seed.phase_code,
  seed.phase_name,
  seed.effort_mm,
  seed.display_order,
  true,
  now(),
  now(),
  NULL,
  NULL
FROM base_effort_seed seed
JOIN public.estimation_solution_variant variant
  ON variant.solution_code = seed.solution_code
  AND variant.variant_code = seed.variant_code
ON CONFLICT (solution_variant_id, phase_code)
DO UPDATE SET
  phase_name = EXCLUDED.phase_name,
  effort_mm = EXCLUDED.effort_mm,
  display_order = EXCLUDED.display_order,
  active = true,
  updated_at = now(),
  updated_by = NULL;

WITH item_seed (
  excel_row_no,
  category_l1,
  category_l2,
  item_name,
  item_option,
  display_order
) AS (
VALUES
${valuesList(itemValues)}
),
updated AS (
  UPDATE public.estimation_standard_item_meta target
  SET
    excel_row_no = seed.excel_row_no,
    display_order = seed.display_order,
    active = true,
    updated_at = now(),
    updated_by = NULL
  FROM item_seed seed
  WHERE target.category_l1 = seed.category_l1
    AND COALESCE(target.category_l2, '') = COALESCE(seed.category_l2, '')
    AND target.item_name = seed.item_name
    AND COALESCE(target.item_option, '') = COALESCE(seed.item_option, '')
  RETURNING target.item_id
)
INSERT INTO public.estimation_standard_item_meta (
  excel_row_no,
  category_l1,
  category_l2,
  item_name,
  item_option,
  display_order,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  seed.excel_row_no,
  seed.category_l1,
  seed.category_l2,
  seed.item_name,
  seed.item_option,
  seed.display_order,
  true,
  now(),
  now(),
  NULL,
  NULL
FROM item_seed seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.estimation_standard_item_meta target
  WHERE target.category_l1 = seed.category_l1
    AND COALESCE(target.category_l2, '') = COALESCE(seed.category_l2, '')
    AND target.item_name = seed.item_name
    AND COALESCE(target.item_option, '') = COALESCE(seed.item_option, '')
);

WITH coefficient_seed (
  excel_row_no,
  category_l1,
  category_l2,
  item_name,
  item_option,
  solution_code,
  variant_code,
  coefficient
) AS (
VALUES
${valuesList(coefficientValues)}
)
INSERT INTO public.estimation_item_solution_coefficient_meta (
  item_id,
  solution_variant_id,
  coefficient,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  item.item_id,
  variant.solution_variant_id,
  seed.coefficient,
  true,
  now(),
  now(),
  NULL,
  NULL
FROM coefficient_seed seed
JOIN public.estimation_standard_item_meta item
  ON item.category_l1 = seed.category_l1
  AND COALESCE(item.category_l2, '') = COALESCE(seed.category_l2, '')
  AND item.item_name = seed.item_name
  AND COALESCE(item.item_option, '') = COALESCE(seed.item_option, '')
JOIN public.estimation_solution_variant variant
  ON variant.solution_code = seed.solution_code
  AND variant.variant_code = seed.variant_code
ON CONFLICT (item_id, solution_variant_id)
DO UPDATE SET
  coefficient = EXCLUDED.coefficient,
  active = true,
  updated_at = now(),
  updated_by = NULL;

COMMIT;
`;
}

export function writeSeedSql({
  workbookPath = DEFAULT_WORKBOOK_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
} = {}) {
  const seedData = buildStandardEffortSeedData(workbookPath);
  const sql = buildSeedSql(seedData);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, sql, "utf8");

  return {
    outputPath,
    seedData,
  };
}

function isMainModule() {
  return process.argv[1]
    ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
    : false;
}

if (isMainModule()) {
  const workbookPath = process.argv[2] || DEFAULT_WORKBOOK_PATH;
  const outputPath = process.argv[3] || DEFAULT_OUTPUT_PATH;
  const { seedData } = writeSeedSql({ workbookPath, outputPath });

  console.log(
    JSON.stringify(
      {
        workbookPath,
        outputPath,
        solutionCount: seedData.solutions.length,
        solutionVariantCount: seedData.solutionVariants.length,
        baseEffortRowCount: seedData.baseEffortRows.length,
        itemRowCount: seedData.itemRows.length,
        coefficientRowCount: seedData.coefficientRows.length,
      },
      null,
      2
    )
  );
}
