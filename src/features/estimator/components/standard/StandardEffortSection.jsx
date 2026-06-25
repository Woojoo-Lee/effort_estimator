import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import StandardEffortPanel from "./StandardEffortPanel";

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

function upsertSolutionSelection(selections = [], nextSelection = {}, projectId) {
  let didReplace = false;
  const nextSelections = selections.map((selection) => {
    const isSameRow =
      selection.solution_variant_id === nextSelection.solution_variant_id &&
      isSelectionForProject(selection, projectId);

    if (!isSameRow) {
      return selection;
    }

    didReplace = true;
    return {
      ...selection,
      ...nextSelection,
      project_id: selection.project_id ?? nextSelection.project_id,
    };
  });

  return didReplace ? nextSelections : [...nextSelections, nextSelection];
}

function upsertItemSelection(selections = [], nextSelection = {}, projectId) {
  let didReplace = false;
  const nextSelections = selections.map((selection) => {
    const isSameRow =
      selection.solution_variant_id === nextSelection.solution_variant_id &&
      selection.item_id === nextSelection.item_id &&
      isSelectionForProject(selection, projectId);

    if (!isSameRow) {
      return selection;
    }

    didReplace = true;
    return {
      ...selection,
      ...nextSelection,
      project_id: selection.project_id ?? nextSelection.project_id,
    };
  });

  return didReplace ? nextSelections : [...nextSelections, nextSelection];
}

export default function StandardEffortSection({
  projectId,
  standardEffort,
  standardEffortActions,
  readOnly = false,
  solutionSelectionReadOnly = readOnly,
  itemSelectionReadOnly = readOnly,
  actualEffortReadOnly = readOnly,
  auditActor,
}) {
  const refreshStatusTimerRef = useRef(null);
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
    setStandardProjectSolutionSelections,
    setStandardProjectItemSelections,
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

  const clearRefreshStatusTimer = useCallback(() => {
    if (refreshStatusTimerRef.current) {
      clearTimeout(refreshStatusTimerRef.current);
      refreshStatusTimerRef.current = null;
    }
  }, []);

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

  useEffect(() => clearRefreshStatusTimer, [clearRefreshStatusTimer]);

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
      if (solutionSelectionReadOnly) {
        return false;
      }

      if (!projectId) {
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
      setStandardProjectSolutionSelections?.(
        upsertSolutionSelection(
          projectSolutionSelections,
          {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            enabled,
            actual_effort_mm: existingActualEffortMm,
          },
          projectId
        )
      );

      return true;
    },
    [
      projectId,
      projectSolutionSelections,
      solutionSelectionReadOnly,
      setStandardProjectSolutionSelections,
    ]
  );

  const handleToggleItem = useCallback(
    async (solutionVariantId, itemId, checked) => {
      if (itemSelectionReadOnly) {
        return false;
      }

      if (!projectId) {
        return false;
      }

      const existingSelection = findItemSelection(
        projectItemSelections,
        solutionVariantId,
        itemId,
        projectId
      );
      setStandardProjectItemSelections?.(
        upsertItemSelection(
          projectItemSelections,
          {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            item_id: itemId,
            checked,
          },
          projectId
        )
      );

      return true;
    },
    [
      projectId,
      projectItemSelections,
      itemSelectionReadOnly,
      setStandardProjectItemSelections,
    ]
  );

  const handleChangeActualEffort = useCallback(
    async (solutionVariantId, value) => {
      if (actualEffortReadOnly) {
        return false;
      }

      if (!projectId) {
        const error = new Error("projectId 또는 solutionVariantId가 없습니다.");
        return Promise.reject(error);
      }

      const existingSelection = findSolutionSelection(
        projectSolutionSelections,
        solutionVariantId,
        projectId
      );
      const nextActualEffortMm = toNumberOrZero(value);
      const previousEnabled = existingSelection?.enabled !== false;

      setStandardProjectSolutionSelections?.(
        upsertSolutionSelection(
          projectSolutionSelections,
          {
            project_id: projectId,
            solution_variant_id: solutionVariantId,
            enabled: previousEnabled,
            actual_effort_mm: nextActualEffortMm,
          },
          projectId
        )
      );

      return true;
    },
    [
      actualEffortReadOnly,
      projectId,
      projectSolutionSelections,
      setStandardProjectSolutionSelections,
    ]
  );
  const displayError = refreshStatus.status === "failed" ? "" : error;

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
        refreshStatus={refreshStatus}
        refreshDisabled={
          !projectId || loading || refreshStatus.status === "refreshing"
        }
        onRefresh={handleRefresh}
        onToggleSolution={handleToggleSolution}
        onToggleItem={handleToggleItem}
        onChangeActualEffort={handleChangeActualEffort}
        readOnly={readOnly}
        solutionSelectionReadOnly={solutionSelectionReadOnly}
        itemSelectionReadOnly={itemSelectionReadOnly}
        actualEffortReadOnly={actualEffortReadOnly}
      />
    </section>
  );
}
