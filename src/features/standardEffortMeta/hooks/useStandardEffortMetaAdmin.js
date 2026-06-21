import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildStandardEffortMetaSummary,
  fetchStandardEffortMetaAdmin,
  STANDARD_BASE_EFFORT_PHASES,
  updateStandardItemActive,
  updateStandardSolutionVariantActive,
  upsertStandardBaseEffortRows,
  upsertStandardCoefficientRows,
} from "../../../services/standardEffortMetaRepository";
import {
  AUDIT_EVENT_TYPES,
  AUDIT_TARGET_TYPES,
  createAuditLogSafe,
  decorateAuditMetadata,
  resolveFrontendAuditPolicy,
  shouldWriteFrontendAudit,
} from "../../audit";
import { buildRowHistoryActor } from "../../auth/lib/rowHistoryActor";

const EMPTY_META = {
  solutions: [],
  solutionVariants: [],
  baseEffortRows: [],
  itemRows: [],
  coefficientRows: [],
};

function getErrorMessage(error) {
  return error?.message || "표준공수 메타를 불러오지 못했습니다.";
}

function toDraftValue(value) {
  if (value === null || value === undefined) {
    return "0";
  }

  return String(value);
}

function toNumberOrThrow(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("기본공수는 숫자여야 합니다.");
  }

  if (numericValue < 0) {
    throw new Error("기본공수는 0 이상이어야 합니다.");
  }

  return numericValue;
}

function toNumberOrZero(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function buildBaseEffortRowMap(baseEffortRows = []) {
  return new Map(
    baseEffortRows.map((row) => [
      `${row.solution_variant_id}:${row.phase_code}`,
      row,
    ])
  );
}

function buildBaseEffortAuditRows(solutionVariantId, draftRow = {}, meta = EMPTY_META) {
  const rowMap = buildBaseEffortRowMap(meta.baseEffortRows);

  return STANDARD_BASE_EFFORT_PHASES.map((phase) => {
    const existingRow = rowMap.get(`${solutionVariantId}:${phase.phase_code}`);

    return {
      phase_code: phase.phase_code,
      phase_name: existingRow?.phase_name || phase.phase_name,
      effort_mm: toNumberOrZero(draftRow[phase.phase_code]),
    };
  });
}

function buildBaseEffortAuditRowsFromSavedRows(savedRows = []) {
  const rowMap = new Map(savedRows.map((row) => [row.phase_code, row]));

  return STANDARD_BASE_EFFORT_PHASES.map((phase) => {
    const savedRow = rowMap.get(phase.phase_code);

    return {
      phase_code: phase.phase_code,
      phase_name: savedRow?.phase_name || phase.phase_name,
      effort_mm: toNumberOrZero(savedRow?.effort_mm ?? savedRow?.effort_md),
    };
  });
}

function buildBaseEffortDrafts(meta = EMPTY_META) {
  const rowMap = buildBaseEffortRowMap(meta.baseEffortRows);

  return (meta.solutionVariants || []).reduce((result, variant) => {
    result[variant.solution_variant_id] = STANDARD_BASE_EFFORT_PHASES.reduce(
      (phaseResult, phase) => {
        const row = rowMap.get(
          `${variant.solution_variant_id}:${phase.phase_code}`
        );

        phaseResult[phase.phase_code] = toDraftValue(
          row?.effort_mm ?? row?.effort_md ?? 0
        );
        return phaseResult;
      },
      {}
    );

    return result;
  }, {});
}

function isDraftRowDirty(draftRow = {}, originalRow = {}) {
  return STANDARD_BASE_EFFORT_PHASES.some(
    (phase) =>
      String(draftRow[phase.phase_code] ?? "0") !==
      String(originalRow[phase.phase_code] ?? "0")
  );
}

function mergeBaseEffortRows(existingRows = [], savedRows = []) {
  const savedKeys = new Set(
    savedRows.map((row) => `${row.solution_variant_id}:${row.phase_code}`)
  );

  return [
    ...existingRows.filter(
      (row) => !savedKeys.has(`${row.solution_variant_id}:${row.phase_code}`)
    ),
    ...savedRows,
  ];
}

function buildPhaseRowsForSave(
  solutionVariantId,
  draftRow = {},
  meta = EMPTY_META
) {
  const rowMap = buildBaseEffortRowMap(meta.baseEffortRows);

  return STANDARD_BASE_EFFORT_PHASES.map((phase) => {
    const existingRow = rowMap.get(`${solutionVariantId}:${phase.phase_code}`);

    return {
      phase_code: phase.phase_code,
      phase_name: existingRow?.phase_name || phase.phase_name,
      effort_mm: toNumberOrThrow(draftRow[phase.phase_code]),
      display_order: existingRow?.display_order ?? phase.display_order,
      active: existingRow?.active ?? true,
    };
  });
}

function buildCoefficientRowMap(coefficientRows = []) {
  return new Map(
    coefficientRows.map((row) => [
      `${row.item_id}:${row.solution_variant_id}`,
      row,
    ])
  );
}

function buildCoefficientDrafts(meta = EMPTY_META) {
  const rowMap = buildCoefficientRowMap(meta.coefficientRows);

  return (meta.itemRows || []).reduce((result, item) => {
    result[item.item_id] = (meta.solutionVariants || []).reduce(
      (variantResult, variant) => {
        const row = rowMap.get(`${item.item_id}:${variant.solution_variant_id}`);

        variantResult[variant.solution_variant_id] = toDraftValue(
          row?.coefficient ?? 0
        );
        return variantResult;
      },
      {}
    );

    return result;
  }, {});
}

function isCoefficientDraftRowDirty(draftRow = {}, originalRow = {}) {
  const variantIds = new Set([
    ...Object.keys(draftRow || {}),
    ...Object.keys(originalRow || {}),
  ]);

  return [...variantIds].some(
    (variantId) =>
      String(draftRow[variantId] ?? "0") !==
      String(originalRow[variantId] ?? "0")
  );
}

function mergeCoefficientRows(existingRows = [], savedRows = []) {
  const savedKeys = new Set(
    savedRows.map((row) => `${row.item_id}:${row.solution_variant_id}`)
  );

  return [
    ...existingRows.filter(
      (row) => !savedKeys.has(`${row.item_id}:${row.solution_variant_id}`)
    ),
    ...savedRows,
  ];
}

function toCoefficientOrThrow(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("계수는 숫자여야 합니다.");
  }

  if (numericValue < 0) {
    throw new Error("계수는 0 이상이어야 합니다.");
  }

  return numericValue;
}

function buildCoefficientRowsForSave(itemId, draftRow = {}, meta = EMPTY_META) {
  const rowMap = buildCoefficientRowMap(meta.coefficientRows);

  return (meta.solutionVariants || []).map((variant) => {
    const existingRow = rowMap.get(`${itemId}:${variant.solution_variant_id}`);

    return {
      solution_variant_id: variant.solution_variant_id,
      coefficient: toCoefficientOrThrow(draftRow[variant.solution_variant_id]),
      active: existingRow?.active ?? true,
    };
  });
}

function buildCoefficientAuditRows(itemId, draftRow = {}, meta = EMPTY_META) {
  return (meta.solutionVariants || []).map((variant) => ({
    solution_variant_id: variant.solution_variant_id,
    coefficient: toNumberOrZero(draftRow[variant.solution_variant_id]),
  }));
}

function buildCoefficientAuditRowsFromSavedRows(savedRows = [], meta = EMPTY_META) {
  const rowMap = new Map(
    savedRows.map((row) => [row.solution_variant_id, row])
  );

  return (meta.solutionVariants || []).map((variant) => {
    const savedRow = rowMap.get(variant.solution_variant_id);

    return {
      solution_variant_id: variant.solution_variant_id,
      coefficient: toNumberOrZero(savedRow?.coefficient),
    };
  });
}

function updateVariantActiveInMeta(meta = EMPTY_META, solutionVariantId, active) {
  return {
    ...meta,
    solutionVariants: (meta.solutionVariants || []).map((variant) =>
      variant.solution_variant_id === solutionVariantId
        ? { ...variant, active }
        : variant
    ),
  };
}

function updateItemActiveInMeta(meta = EMPTY_META, itemId, active) {
  return {
    ...meta,
    itemRows: (meta.itemRows || []).map((item) =>
      item.item_id === itemId ? { ...item, active } : item
    ),
  };
}

export default function useStandardEffortMetaAdmin(options = {}) {
  const { auditActor = {}, auditEnabled = true } = options;
  const rowHistoryOptions = useMemo(() => {
    const currentUser = buildRowHistoryActor(auditActor);

    return currentUser ? { currentUser } : null;
  }, [auditActor?.actorUserId]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [summary, setSummary] = useState(() =>
    buildStandardEffortMetaSummary(EMPTY_META)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [baseEffortDrafts, setBaseEffortDrafts] = useState({});
  const [baseEffortOriginalDrafts, setBaseEffortOriginalDrafts] = useState({});
  const [baseEffortDirtyMap, setBaseEffortDirtyMap] = useState({});
  const [baseEffortSavingMap, setBaseEffortSavingMap] = useState({});
  const [baseEffortErrorMap, setBaseEffortErrorMap] = useState({});
  const [baseEffortSavedMap, setBaseEffortSavedMap] = useState({});
  const [coefficientDrafts, setCoefficientDrafts] = useState({});
  const [coefficientOriginalDrafts, setCoefficientOriginalDrafts] = useState({});
  const [coefficientDirtyMap, setCoefficientDirtyMap] = useState({});
  const [coefficientSavingMap, setCoefficientSavingMap] = useState({});
  const [coefficientErrorMap, setCoefficientErrorMap] = useState({});
  const [coefficientSavedMap, setCoefficientSavedMap] = useState({});
  const [variantActiveSavingMap, setVariantActiveSavingMap] = useState({});
  const [variantActiveErrorMap, setVariantActiveErrorMap] = useState({});
  const [variantActiveSavedMap, setVariantActiveSavedMap] = useState({});
  const [itemActiveSavingMap, setItemActiveSavingMap] = useState({});
  const [itemActiveErrorMap, setItemActiveErrorMap] = useState({});
  const [itemActiveSavedMap, setItemActiveSavedMap] = useState({});

  const recordAudit = useCallback(
    (input) => {
      if (!auditEnabled) {
        return;
      }

      const policy = resolveFrontendAuditPolicy();

      if (!shouldWriteFrontendAudit(policy)) {
        return;
      }

      const metadata = {
        ...(input.metadata || {}),
        ...(auditActor?.devOnly ? { dev_only: true } : {}),
      };
      const decoratedMetadata = decorateAuditMetadata(metadata, policy);

      try {
        Promise.resolve(
          createAuditLogSafe({
            ...input,
            actorUserId: auditActor?.actorUserId ?? null,
            actorEmail: auditActor?.actorEmail ?? null,
            metadata: decoratedMetadata,
          })
        )
          .then((result) => {
            if (result?.ok === false) {
              console.warn("Audit log write failed", result.error);
            }
          })
          .catch((caughtError) => {
            console.warn("Audit log write failed", caughtError);
          });
      } catch (caughtError) {
        console.warn("Audit log write failed", caughtError);
      }
    },
    [auditActor?.actorEmail, auditActor?.actorUserId, auditActor?.devOnly, auditEnabled]
  );

  const applyLoadedMeta = useCallback((nextMeta) => {
    const nextDrafts = buildBaseEffortDrafts(nextMeta);
    const nextCoefficientDrafts = buildCoefficientDrafts(nextMeta);

    setMeta(nextMeta);
    setSummary(buildStandardEffortMetaSummary(nextMeta));
    setBaseEffortDrafts(nextDrafts);
    setBaseEffortOriginalDrafts(nextDrafts);
    setBaseEffortDirtyMap({});
    setBaseEffortSavingMap({});
    setBaseEffortErrorMap({});
    setBaseEffortSavedMap({});
    setCoefficientDrafts(nextCoefficientDrafts);
    setCoefficientOriginalDrafts(nextCoefficientDrafts);
    setCoefficientDirtyMap({});
    setCoefficientSavingMap({});
    setCoefficientErrorMap({});
    setCoefficientSavedMap({});
    setVariantActiveSavingMap({});
    setVariantActiveErrorMap({});
    setVariantActiveSavedMap({});
    setItemActiveSavingMap({});
    setItemActiveErrorMap({});
    setItemActiveSavedMap({});
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextMeta = await fetchStandardEffortMetaAdmin();

      applyLoadedMeta(nextMeta);
      setLoading(false);
      return nextMeta;
    } catch (caughtError) {
      console.error(caughtError);
      applyLoadedMeta(EMPTY_META);
      setError(getErrorMessage(caughtError));
      setLoading(false);
      return null;
    }
  }, [applyLoadedMeta]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextMeta = await fetchStandardEffortMetaAdmin();

        if (!active) {
          return;
        }

        applyLoadedMeta(nextMeta);
        setLoading(false);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        console.error(caughtError);
        applyLoadedMeta(EMPTY_META);
        setError(getErrorMessage(caughtError));
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [applyLoadedMeta]);

  const updateBaseEffortDraft = useCallback(
    (solutionVariantId, phaseCode, value) => {
      const currentRow = baseEffortDrafts[solutionVariantId] || {};
      const nextRow = {
        ...currentRow,
        [phaseCode]: value,
      };
      const isDirty = isDraftRowDirty(
        nextRow,
        baseEffortOriginalDrafts[solutionVariantId]
      );

      setBaseEffortDrafts((prev) => ({
        ...prev,
        [solutionVariantId]: nextRow,
      }));
      setBaseEffortDirtyMap((dirtyMap) => ({
        ...dirtyMap,
        [solutionVariantId]: isDirty,
      }));
      setBaseEffortErrorMap((errorMap) => ({
        ...errorMap,
        [solutionVariantId]: "",
      }));
      setBaseEffortSavedMap((savedMap) => ({
        ...savedMap,
        [solutionVariantId]: false,
      }));
    },
    [baseEffortDrafts, baseEffortOriginalDrafts]
  );

  const resetBaseEffortDraft = useCallback(
    (solutionVariantId) => {
      setBaseEffortDrafts((prev) => ({
        ...prev,
        [solutionVariantId]: {
          ...(baseEffortOriginalDrafts[solutionVariantId] || {}),
        },
      }));
      setBaseEffortDirtyMap((prev) => ({
        ...prev,
        [solutionVariantId]: false,
      }));
      setBaseEffortErrorMap((prev) => ({
        ...prev,
        [solutionVariantId]: "",
      }));
      setBaseEffortSavedMap((prev) => ({
        ...prev,
        [solutionVariantId]: false,
      }));
    },
    [baseEffortOriginalDrafts]
  );

  const saveBaseEffortRow = useCallback(
    async (solutionVariantId) => {
      const draftRow = baseEffortDrafts[solutionVariantId] || {};
      const beforeRows = buildBaseEffortAuditRows(
        solutionVariantId,
        baseEffortOriginalDrafts[solutionVariantId],
        meta
      );

      setBaseEffortSavingMap((prev) => ({
        ...prev,
        [solutionVariantId]: true,
      }));
      setBaseEffortErrorMap((prev) => ({
        ...prev,
        [solutionVariantId]: "",
      }));
      setBaseEffortSavedMap((prev) => ({
        ...prev,
        [solutionVariantId]: false,
      }));

      try {
        const phaseRows = buildPhaseRowsForSave(
          solutionVariantId,
          draftRow,
          meta
        );
        const savedRows = rowHistoryOptions
          ? await upsertStandardBaseEffortRows(
              solutionVariantId,
              phaseRows,
              undefined,
              rowHistoryOptions
            )
          : await upsertStandardBaseEffortRows(solutionVariantId, phaseRows);
        const savedDraftRow = buildBaseEffortDrafts({
          solutionVariants: [
            {
              solution_variant_id: solutionVariantId,
            },
          ],
          baseEffortRows: savedRows,
        })[solutionVariantId];

        setMeta((prev) => {
          const nextMeta = {
            ...prev,
            baseEffortRows: mergeBaseEffortRows(
              prev.baseEffortRows,
              savedRows
            ),
          };

          setSummary(buildStandardEffortMetaSummary(nextMeta));
          return nextMeta;
        });
        setBaseEffortDrafts((prev) => ({
          ...prev,
          [solutionVariantId]: savedDraftRow,
        }));
        setBaseEffortOriginalDrafts((prev) => ({
          ...prev,
          [solutionVariantId]: savedDraftRow,
        }));
        setBaseEffortDirtyMap((prev) => ({
          ...prev,
          [solutionVariantId]: false,
        }));
        setBaseEffortSavingMap((prev) => ({
          ...prev,
          [solutionVariantId]: false,
        }));
        setBaseEffortSavedMap((prev) => ({
          ...prev,
          [solutionVariantId]: true,
        }));
        recordAudit({
          eventType:
            AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_BASE_EFFORT_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: solutionVariantId,
          before: beforeRows,
          after: buildBaseEffortAuditRowsFromSavedRows(savedRows),
          metadata: {
            section: "base_effort",
            solution_variant_id: solutionVariantId,
            unit: "M/M",
          },
        });

        return true;
      } catch (caughtError) {
        console.error(caughtError);
        setBaseEffortSavingMap((prev) => ({
          ...prev,
          [solutionVariantId]: false,
        }));
        setBaseEffortErrorMap((prev) => ({
          ...prev,
          [solutionVariantId]:
            caughtError?.message || "기본공수 저장에 실패했습니다.",
        }));
        setBaseEffortSavedMap((prev) => ({
          ...prev,
          [solutionVariantId]: false,
        }));
        return false;
      }
    },
    [
      baseEffortDrafts,
      baseEffortOriginalDrafts,
      meta,
      recordAudit,
      rowHistoryOptions,
    ]
  );

  const updateCoefficientDraft = useCallback(
    (itemId, solutionVariantId, value) => {
      const currentRow = coefficientDrafts[itemId] || {};
      const nextRow = {
        ...currentRow,
        [solutionVariantId]: value,
      };
      const isDirty = isCoefficientDraftRowDirty(
        nextRow,
        coefficientOriginalDrafts[itemId]
      );

      setCoefficientDrafts((prev) => ({
        ...prev,
        [itemId]: nextRow,
      }));
      setCoefficientDirtyMap((dirtyMap) => ({
        ...dirtyMap,
        [itemId]: isDirty,
      }));
      setCoefficientErrorMap((errorMap) => ({
        ...errorMap,
        [itemId]: "",
      }));
      setCoefficientSavedMap((savedMap) => ({
        ...savedMap,
        [itemId]: false,
      }));
    },
    [coefficientDrafts, coefficientOriginalDrafts]
  );

  const resetCoefficientDraft = useCallback(
    (itemId) => {
      setCoefficientDrafts((prev) => ({
        ...prev,
        [itemId]: {
          ...(coefficientOriginalDrafts[itemId] || {}),
        },
      }));
      setCoefficientDirtyMap((prev) => ({
        ...prev,
        [itemId]: false,
      }));
      setCoefficientErrorMap((prev) => ({
        ...prev,
        [itemId]: "",
      }));
      setCoefficientSavedMap((prev) => ({
        ...prev,
        [itemId]: false,
      }));
    },
    [coefficientOriginalDrafts]
  );

  const saveCoefficientRow = useCallback(
    async (itemId) => {
      const draftRow = coefficientDrafts[itemId] || {};
      const beforeRows = buildCoefficientAuditRows(
        itemId,
        coefficientOriginalDrafts[itemId],
        meta
      );

      setCoefficientSavingMap((prev) => ({
        ...prev,
        [itemId]: true,
      }));
      setCoefficientErrorMap((prev) => ({
        ...prev,
        [itemId]: "",
      }));
      setCoefficientSavedMap((prev) => ({
        ...prev,
        [itemId]: false,
      }));

      try {
        const coefficientRows = buildCoefficientRowsForSave(
          itemId,
          draftRow,
          meta
        );
        const savedRows = rowHistoryOptions
          ? await upsertStandardCoefficientRows(
              itemId,
              coefficientRows,
              undefined,
              rowHistoryOptions
            )
          : await upsertStandardCoefficientRows(itemId, coefficientRows);
        const savedDraftRow = buildCoefficientDrafts({
          itemRows: [
            {
              item_id: itemId,
            },
          ],
          solutionVariants: meta.solutionVariants,
          coefficientRows: savedRows,
        })[itemId];

        setMeta((prev) => {
          const nextMeta = {
            ...prev,
            coefficientRows: mergeCoefficientRows(
              prev.coefficientRows,
              savedRows
            ),
          };

          setSummary(buildStandardEffortMetaSummary(nextMeta));
          return nextMeta;
        });
        setCoefficientDrafts((prev) => ({
          ...prev,
          [itemId]: savedDraftRow,
        }));
        setCoefficientOriginalDrafts((prev) => ({
          ...prev,
          [itemId]: savedDraftRow,
        }));
        setCoefficientDirtyMap((prev) => ({
          ...prev,
          [itemId]: false,
        }));
        setCoefficientSavingMap((prev) => ({
          ...prev,
          [itemId]: false,
        }));
        setCoefficientSavedMap((prev) => ({
          ...prev,
          [itemId]: true,
        }));
        recordAudit({
          eventType:
            AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_COEFFICIENT_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: itemId,
          before: beforeRows,
          after: buildCoefficientAuditRowsFromSavedRows(savedRows, meta),
          metadata: {
            section: "coefficient",
            item_id: itemId,
            coefficient_unit: "unitless",
          },
        });

        return true;
      } catch (caughtError) {
        console.error(caughtError);
        setCoefficientSavingMap((prev) => ({
          ...prev,
          [itemId]: false,
        }));
        setCoefficientErrorMap((prev) => ({
          ...prev,
          [itemId]: caughtError?.message || "계수 저장에 실패했습니다.",
        }));
        setCoefficientSavedMap((prev) => ({
          ...prev,
          [itemId]: false,
        }));
        return false;
      }
    },
    [
      coefficientDrafts,
      coefficientOriginalDrafts,
      meta,
      recordAudit,
      rowHistoryOptions,
    ]
  );

  const toggleSolutionVariantActive = useCallback(
    async (solutionVariantId, active) => {
      const currentVariant = (meta.solutionVariants || []).find(
        (variant) => variant.solution_variant_id === solutionVariantId
      );
      const previousActive = currentVariant?.active !== false;

      setVariantActiveSavingMap((prev) => ({
        ...prev,
        [solutionVariantId]: true,
      }));
      setVariantActiveErrorMap((prev) => ({
        ...prev,
        [solutionVariantId]: "",
      }));
      setVariantActiveSavedMap((prev) => ({
        ...prev,
        [solutionVariantId]: false,
      }));
      setMeta((prev) => {
        const nextMeta = updateVariantActiveInMeta(
          prev,
          solutionVariantId,
          active
        );

        setSummary(buildStandardEffortMetaSummary(nextMeta));
        return nextMeta;
      });

      try {
        const savedVariant = rowHistoryOptions
          ? await updateStandardSolutionVariantActive(
              solutionVariantId,
              active,
              undefined,
              rowHistoryOptions
            )
          : await updateStandardSolutionVariantActive(solutionVariantId, active);
        const savedActive = savedVariant.active !== false;

        setMeta((prev) => {
          const nextMeta = updateVariantActiveInMeta(
            prev,
            solutionVariantId,
            savedActive
          );

          setSummary(buildStandardEffortMetaSummary(nextMeta));
          return nextMeta;
        });
        setVariantActiveSavingMap((prev) => ({
          ...prev,
          [solutionVariantId]: false,
        }));
        setVariantActiveSavedMap((prev) => ({
          ...prev,
          [solutionVariantId]: true,
        }));
        recordAudit({
          eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_ACTIVE_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: solutionVariantId,
          before: {
            active: previousActive,
          },
          after: {
            active: savedActive,
          },
          metadata: {
            section: "solution_variant_active",
            solution_variant_id: solutionVariantId,
          },
        });

        return true;
      } catch (caughtError) {
        console.error(caughtError);
        setMeta((prev) => {
          const nextMeta = updateVariantActiveInMeta(
            prev,
            solutionVariantId,
            previousActive
          );

          setSummary(buildStandardEffortMetaSummary(nextMeta));
          return nextMeta;
        });
        setVariantActiveSavingMap((prev) => ({
          ...prev,
          [solutionVariantId]: false,
        }));
        setVariantActiveErrorMap((prev) => ({
          ...prev,
          [solutionVariantId]:
            caughtError?.message || "solution variant 사용 여부 저장에 실패했습니다.",
        }));
        setVariantActiveSavedMap((prev) => ({
          ...prev,
          [solutionVariantId]: false,
        }));
        return false;
      }
    },
    [meta.solutionVariants, recordAudit, rowHistoryOptions]
  );

  const toggleStandardItemActive = useCallback(
    async (itemId, active) => {
      const currentItem = (meta.itemRows || []).find(
        (item) => item.item_id === itemId
      );
      const previousActive = currentItem?.active !== false;

      setItemActiveSavingMap((prev) => ({
        ...prev,
        [itemId]: true,
      }));
      setItemActiveErrorMap((prev) => ({
        ...prev,
        [itemId]: "",
      }));
      setItemActiveSavedMap((prev) => ({
        ...prev,
        [itemId]: false,
      }));
      setMeta((prev) => {
        const nextMeta = updateItemActiveInMeta(prev, itemId, active);

        setSummary(buildStandardEffortMetaSummary(nextMeta));
        return nextMeta;
      });

      try {
        const savedItem = rowHistoryOptions
          ? await updateStandardItemActive(
              itemId,
              active,
              undefined,
              rowHistoryOptions
            )
          : await updateStandardItemActive(itemId, active);
        const savedActive = savedItem.active !== false;

        setMeta((prev) => {
          const nextMeta = updateItemActiveInMeta(prev, itemId, savedActive);

          setSummary(buildStandardEffortMetaSummary(nextMeta));
          return nextMeta;
        });
        setItemActiveSavingMap((prev) => ({
          ...prev,
          [itemId]: false,
        }));
        setItemActiveSavedMap((prev) => ({
          ...prev,
          [itemId]: true,
        }));
        recordAudit({
          eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_META_ACTIVE_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT_META,
          targetId: itemId,
          before: {
            active: previousActive,
          },
          after: {
            active: savedActive,
          },
          metadata: {
            section: "item_active",
            item_id: itemId,
          },
        });

        return true;
      } catch (caughtError) {
        console.error(caughtError);
        setMeta((prev) => {
          const nextMeta = updateItemActiveInMeta(prev, itemId, previousActive);

          setSummary(buildStandardEffortMetaSummary(nextMeta));
          return nextMeta;
        });
        setItemActiveSavingMap((prev) => ({
          ...prev,
          [itemId]: false,
        }));
        setItemActiveErrorMap((prev) => ({
          ...prev,
          [itemId]: caughtError?.message || "기능항목 사용 여부 저장에 실패했습니다.",
        }));
        setItemActiveSavedMap((prev) => ({
          ...prev,
          [itemId]: false,
        }));
        return false;
      }
    },
    [meta.itemRows, recordAudit, rowHistoryOptions]
  );

  return {
    meta,
    summary,
    loading,
    error,
    reload,
    baseEffortDrafts,
    baseEffortDirtyMap,
    baseEffortSavingMap,
    baseEffortErrorMap,
    baseEffortSavedMap,
    updateBaseEffortDraft,
    resetBaseEffortDraft,
    saveBaseEffortRow,
    coefficientDrafts,
    coefficientDirtyMap,
    coefficientSavingMap,
    coefficientErrorMap,
    coefficientSavedMap,
    updateCoefficientDraft,
    resetCoefficientDraft,
    saveCoefficientRow,
    variantActiveSavingMap,
    variantActiveErrorMap,
    variantActiveSavedMap,
    toggleSolutionVariantActive,
    itemActiveSavingMap,
    itemActiveErrorMap,
    itemActiveSavedMap,
    toggleStandardItemActive,
  };
}
