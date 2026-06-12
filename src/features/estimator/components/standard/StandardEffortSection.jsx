import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AUDIT_EVENT_TYPES,
  AUDIT_TARGET_TYPES,
  createAuditLogSafe,
  decorateAuditMetadata,
  resolveFrontendAuditPolicy,
  shouldWriteFrontendAudit,
} from "../../../audit";
import StandardEffortPanel from "./StandardEffortPanel";

const SAVE_COMPLETE_VISIBLE_MS = 1600;
const REFRESH_COMPLETE_VISIBLE_MS = 1600;

function isSameProjectId(left, right) {
  if (!left || !right) {
    return false;
  }

  return String(left) === String(right);
}

function isSelectionForProject(selection = {}, projectId) {
  if (!selection.project_id || !projectId) {
    return true;
  }

  return isSameProjectId(selection.project_id, projectId);
}

function findSolutionSelection(selections = [], solutionVariantId, projectId) {
  return selections.find(
    (selection) =>
      selection.solution_variant_id === solutionVariantId &&
      isSelectionForProject(selection, projectId)
  );
}

function findItemSelection(selections = [], solutionVariantId, itemId, projectId) {
  return selections.find(
    (selection) =>
      selection.solution_variant_id === solutionVariantId &&
      selection.item_id === itemId &&
      isSelectionForProject(selection, projectId)
  );
}

function toNumberOrZero(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function StandardEffortSection({
  projectId,
  standardEffort,
  standardEffortActions,
  readOnly = false,
  actualEffortReadOnly = readOnly,
  auditActor,
}) {
  const saveStatusTimerRef = useRef(null);
  const refreshStatusTimerRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState({
    status: "idle",
    message: "",
  });
  const [refreshStatus, setRefreshStatus] = useState({
    status: "idle",
    message: "",
  });
  const {
    meta = {},
    projectSolutionSelections = [],
    projectItemSelections = [],
    results = [],
    totals,
    loading = false,
    error = "",
    loadedProjectId = null,
  } = standardEffort || {};
  const {
    loadProjectStandardEffort,
    refreshProjectStandardEffort,
    saveStandardProjectSolutionSelections,
    saveStandardProjectItemSelections,
    updateStandardActualEffort,
  } = standardEffortActions || {};
  const visibleProjectSolutionSelections = useMemo(
    () =>
      projectSolutionSelections.filter((selection) =>
        isSelectionForProject(selection, projectId)
      ),
    [projectId, projectSolutionSelections]
  );
  const visibleProjectItemSelections = useMemo(
    () =>
      projectItemSelections.filter((selection) =>
        isSelectionForProject(selection, projectId)
      ),
    [projectId, projectItemSelections]
  );

  const recordAudit = useCallback(
    (input) => {
      const policy = resolveFrontendAuditPolicy();

      if (!shouldWriteFrontendAudit(policy)) {
        return;
      }

      const metadata = {
        ...(input.metadata || {}),
        ...(auditActor?.devOnly ? { dev_only: true } : {}),
      };
      const decoratedMetadata = decorateAuditMetadata(metadata, policy);
      const payload = {
        ...input,
        actorUserId: auditActor?.actorUserId ?? null,
        actorEmail: auditActor?.actorEmail ?? null,
        metadata: decoratedMetadata,
      };

      try {
        Promise.resolve(createAuditLogSafe(payload))
          .then((result) => {
            if (result && result.ok === false) {
              console.warn("Standard effort audit log failed.", result.error);
            }
          })
          .catch((error) => {
            console.warn("Standard effort audit log failed.", error);
          });
      } catch (error) {
        console.warn("Standard effort audit log failed.", error);
      }
    },
    [auditActor?.actorEmail, auditActor?.actorUserId, auditActor?.devOnly]
  );
  const clearSaveStatusTimer = useCallback(() => {
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = null;
    }
  }, []);
  const clearRefreshStatusTimer = useCallback(() => {
    if (refreshStatusTimerRef.current) {
      clearTimeout(refreshStatusTimerRef.current);
      refreshStatusTimerRef.current = null;
    }
  }, []);

  const setTransientSaveStatus = useCallback(
    (nextStatus) => {
      clearSaveStatusTimer();
      setSaveStatus(nextStatus);

      if (nextStatus.status === "saved") {
        saveStatusTimerRef.current = setTimeout(() => {
          setSaveStatus({ status: "idle", message: "" });
          saveStatusTimerRef.current = null;
        }, SAVE_COMPLETE_VISIBLE_MS);
      }
    },
    [clearSaveStatusTimer]
  );
  const setTransientRefreshStatus = useCallback(
    (nextStatus) => {
      clearRefreshStatusTimer();
      setRefreshStatus(nextStatus);

      if (nextStatus.status === "refreshed") {
        refreshStatusTimerRef.current = setTimeout(() => {
          setRefreshStatus({ status: "idle", message: "" });
          refreshStatusTimerRef.current = null;
        }, REFRESH_COMPLETE_VISIBLE_MS);
      }
    },
    [clearRefreshStatusTimer]
  );

  useEffect(() => clearSaveStatusTimer, [clearSaveStatusTimer]);
  useEffect(() => clearRefreshStatusTimer, [clearRefreshStatusTimer]);

  const runSave = useCallback(
    async (saveOperation, { rethrow = false } = {}) => {
      setTransientSaveStatus({ status: "saving", message: "저장 중..." });

      try {
        const result = await saveOperation();

        if (result === false) {
          throw new Error("Standard effort save returned false.");
        }

        setTransientSaveStatus({ status: "saved", message: "저장 완료" });
        return true;
      } catch (error) {
        console.error(error);
        setTransientSaveStatus({
          status: "failed",
          message: "저장 실패. 다시 시도해 주세요.",
        });

        if (rethrow) {
          throw error;
        }

        return false;
      }
    },
    [setTransientSaveStatus]
  );

  const handleRefresh = useCallback(async () => {
    if (!projectId || !refreshProjectStandardEffort) {
      setTransientRefreshStatus({
        status: "failed",
        message: "표준공수 데이터를 다시 불러오지 못했습니다.",
      });
      return false;
    }

    setTransientRefreshStatus({
      status: "refreshing",
      message: "새로고침 중...",
    });

    try {
      const result = await refreshProjectStandardEffort(projectId);

      if (result === false) {
        throw new Error("Standard effort refresh returned false.");
      }

      setTransientRefreshStatus({
        status: "refreshed",
        message: "새로고침 완료",
      });
      return true;
    } catch (error) {
      console.error(error);
      setTransientRefreshStatus({
        status: "failed",
        message: "표준공수 데이터를 다시 불러오지 못했습니다.",
      });
      return false;
    }
  }, [projectId, refreshProjectStandardEffort, setTransientRefreshStatus]);

  useEffect(() => {
    if (!projectId || !loadProjectStandardEffort) {
      return;
    }

    if (isSameProjectId(loadedProjectId, projectId)) {
      return;
    }

    loadProjectStandardEffort(projectId);
  }, [loadProjectStandardEffort, loadedProjectId, projectId]);

  const handleToggleSolution = useCallback(
    async (solutionVariantId, enabled) => {
      if (readOnly) {
        return false;
      }

      if (!projectId || !saveStandardProjectSolutionSelections) {
        setTransientSaveStatus({
          status: "failed",
          message: "저장 실패. 다시 시도해 주세요.",
        });
        return false;
      }

      const existingSelection = findSolutionSelection(
        projectSolutionSelections,
        solutionVariantId,
        projectId
      );

      const existingActualEffortMm = toNumberOrZero(
        existingSelection?.actual_effort_mm ??
          existingSelection?.actual_effort_md ??
          existingSelection?.actual_effort
      );
      const previousEnabled = existingSelection?.enabled === true;
      const saved = await runSave(() =>
        saveStandardProjectSolutionSelections(projectId, [
          {
            solution_variant_id: solutionVariantId,
            enabled,
            actual_effort_mm: existingActualEffortMm,
          },
        ])
      );

      if (saved) {
        recordAudit({
          eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_SOLUTION_TOGGLE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT,
          targetId: `${projectId}:${solutionVariantId}`,
          projectId,
          before: {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            enabled: previousEnabled,
            actual_effort_mm: existingActualEffortMm,
          },
          after: {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            enabled,
            actual_effort_mm: existingActualEffortMm,
          },
          metadata: {
            section: "solution_selection",
            project_id: projectId,
            solution_variant_id: solutionVariantId,
          },
        });
      }

      return saved;
    },
    [
      recordAudit,
      projectId,
      projectSolutionSelections,
      readOnly,
      runSave,
      saveStandardProjectSolutionSelections,
      setTransientSaveStatus,
    ]
  );

  const handleToggleItem = useCallback(
    async (solutionVariantId, itemId, checked) => {
      if (readOnly) {
        return false;
      }

      if (!projectId || !saveStandardProjectItemSelections) {
        setTransientSaveStatus({
          status: "failed",
          message: "저장 실패. 다시 시도해 주세요.",
        });
        return false;
      }

      const existingSelection = findItemSelection(
        projectItemSelections,
        solutionVariantId,
        itemId,
        projectId
      );
      const previousChecked = existingSelection?.checked === true;
      const saved = await runSave(() =>
        saveStandardProjectItemSelections(projectId, [
          {
            solution_variant_id: solutionVariantId,
            item_id: itemId,
            checked,
          },
        ])
      );

      if (saved) {
        recordAudit({
          eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_ITEM_CHECK,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT,
          targetId: `${projectId}:${solutionVariantId}:${itemId}`,
          projectId,
          before: {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            item_id: itemId,
            checked: previousChecked,
          },
          after: {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            item_id: itemId,
            checked,
          },
          metadata: {
            section: "item_selection",
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            item_id: itemId,
          },
        });
      }

      return saved;
    },
    [
      recordAudit,
      projectId,
      projectItemSelections,
      readOnly,
      runSave,
      saveStandardProjectItemSelections,
      setTransientSaveStatus,
    ]
  );

  const handleChangeActualEffort = useCallback(
    async (solutionVariantId, value) => {
      if (actualEffortReadOnly) {
        return false;
      }

      if (!projectId || !updateStandardActualEffort) {
        const error = new Error("projectId 또는 solutionVariantId가 없습니다.");
        setTransientSaveStatus({
          status: "failed",
          message: "저장 실패. 다시 시도해 주세요.",
        });
        return Promise.reject(error);
      }

      const existingSelection = findSolutionSelection(
        projectSolutionSelections,
        solutionVariantId,
        projectId
      );
      const previousActualEffortMm = toNumberOrZero(
        existingSelection?.actual_effort_mm ??
          existingSelection?.actual_effort_md ??
          existingSelection?.actual_effort
      );
      const nextActualEffortMm = toNumberOrZero(value);
      const saved = await runSave(
        () => updateStandardActualEffort(projectId, solutionVariantId, value),
        { rethrow: true }
      );

      if (saved && previousActualEffortMm !== nextActualEffortMm) {
        recordAudit({
          eventType: AUDIT_EVENT_TYPES.STANDARD_EFFORT_ACTUAL_EFFORT_UPDATE,
          targetType: AUDIT_TARGET_TYPES.STANDARD_EFFORT,
          targetId: `${projectId}:${solutionVariantId}`,
          projectId,
          before: {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            actual_effort_mm: previousActualEffortMm,
          },
          after: {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            actual_effort_mm: nextActualEffortMm,
          },
          metadata: {
            section: "actual_effort",
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            unit: "M/M",
          },
        });
      }

      return saved;
    },
    [
      actualEffortReadOnly,
      projectId,
      projectSolutionSelections,
      recordAudit,
      runSave,
      setTransientSaveStatus,
      updateStandardActualEffort,
    ]
  );
  const displayError =
    saveStatus.status === "failed" || refreshStatus.status === "failed"
      ? ""
      : error;

  return (
    <section className="mt-3" aria-label="표준공수 산정 신규">
      <StandardEffortPanel
        solutionVariants={meta.solutionVariants || []}
        itemRows={meta.itemRows || []}
        projectSolutionSelections={visibleProjectSolutionSelections}
        projectItemSelections={visibleProjectItemSelections}
        results={results}
        totals={totals}
        loading={loading}
        error={displayError}
        saveStatus={saveStatus}
        refreshStatus={refreshStatus}
        refreshDisabled={
          !projectId || loading || refreshStatus.status === "refreshing"
        }
        onRefresh={handleRefresh}
        onToggleSolution={handleToggleSolution}
        onToggleItem={handleToggleItem}
        onChangeActualEffort={handleChangeActualEffort}
        readOnly={readOnly}
        actualEffortReadOnly={actualEffortReadOnly}
      />
    </section>
  );
}
