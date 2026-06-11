import React from "react";

import HeaderBar from "../../layout/components/HeaderBar";
import ProjectSelectorBar from "../../projects/components/ProjectSelectorBar";
import DetailTable from "../components/DetailTable";
import RightSidebar from "../../layout/components/RightSidebar";
import SolutionTabs from "../components/SolutionTabs";
import SummaryView from "../components/SummaryView";
import { StandardEffortSection } from "../components/standard";
import VersionHistoryModal from "../../projects/components/VersionHistoryModal";

import { useAutoSave } from "../../../hooks/useAutoSave";
import { getAppVersion } from "../../../shared/lib/appVersion";
import { useAppPageModel } from "../../../app/useAppPageModel";
import { PERMISSIONS, isAuthPermissionEnabled, useAuthPermission } from "../../auth";
import { resolveStandardEffortMode } from "../lib/standardEffortMode";

function isArchivedProject(project) {
  return project?.status === "archived" || Boolean(project?.archived_at);
}

function LegacyEstimatorBody({
  page,
  hideRightSidebar = false,
  readOnly = false,
}) {
  const gridClass = hideRightSidebar
    ? "mt-3 grid gap-4"
    : "mt-3 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_360px] xl:items-stretch";

  if (page.estimatorView.activeTab === "summary") {
    return (
      <div className={gridClass}>
        <div className="min-w-0">
          <SummaryView
            solutionTotals={page.estimatorView.solutionTotals}
            grandBaseTotal={page.estimatorView.grandBaseTotal}
          />
        </div>

        {!hideRightSidebar ? (
          <div className="min-w-0 xl:h-full">
            <RightSidebar
              {...page.estimatorView.sidebarModel}
              isSummary
              readOnly={readOnly}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      <div className="min-w-0 xl:h-full">
        <DetailTable
          activeTab={page.estimatorView.activeTab}
          currentItems={page.estimatorView.currentItems}
          updateItem={page.estimatorView.detailActions.updateItem}
          addItem={page.estimatorView.detailActions.addItem}
          removeItem={page.estimatorView.detailActions.removeItem}
          baseEffortMetaRows={page.estimatorView.baseEffortMetaRows}
          itemFieldMetaRows={page.estimatorView.itemFieldMetaRows}
          readOnly={readOnly}
        />
      </div>

      {!hideRightSidebar ? (
        <div className="min-w-0 xl:h-full">
          <RightSidebar
            {...page.estimatorView.sidebarModel}
            readOnly={readOnly}
          />
        </div>
      ) : null}
    </div>
  );
}

function LegacyEstimatorHeader({ page }) {
  return (
    <SolutionTabs
      activeTab={page.estimatorView.activeTab}
      setActiveTab={page.estimatorView.setActiveTab}
    />
  );
}

function StandardModeNotice({ isStandardExportAvailable = false }) {
  return (
    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <p className="font-extrabold">
        현재 화면은 엑셀 표준공수표 기준의 신규 산정 방식입니다.
      </p>
      <p className="mt-1 font-semibold">
        기존 산출 화면은 아래 접기 영역에서 비교용으로 확인할 수 있습니다.
      </p>
      <p className="mt-1 text-xs font-semibold text-blue-700">
        {isStandardExportAvailable
          ? "상단의 Excel 다운로드 버튼으로 표준공수 결과를 내보낼 수 있습니다."
          : "표준공수 내보내기는 API 모드에서 제공됩니다."}
      </p>
    </div>
  );
}

function ArchivedProjectNotice() {
  return (
    <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-extrabold">보관된 프로젝트입니다.</p>
      <p className="mt-1 font-semibold">
        조회만 가능하며 수정/저장은 제한됩니다.
      </p>
    </div>
  );
}

function StandardEffortBlock({ page, readOnly = false, auditActor }) {
  return (
    <StandardEffortSection
      projectId={page.projectSelector.projectId}
      standardEffort={page.estimatorView.standardEffort}
      standardEffortActions={page.estimatorView.standardEffortActions}
      readOnly={readOnly}
      auditActor={auditActor}
    />
  );
}

export default function EstimatorPage() {
  const appVersion = getAppVersion();
  const page = useAppPageModel();
  const { authz, user, devOnly } = useAuthPermission();
  const standardEffortMode = resolveStandardEffortMode(import.meta.env);
  const isStandardExportAvailable =
    standardEffortMode.isStandardMode;
  const isAuthzEnabled = isAuthPermissionEnabled(import.meta.env);
  const canWriteStandardEffort =
    !isAuthzEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.STANDARD_EFFORT_SELECTION_WRITE,
      PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE,
    ]);
  const canWriteProject =
    !isAuthzEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.PROJECT_WRITE_OWN,
      PERMISSIONS.PROJECT_WRITE_ASSIGNED,
      PERMISSIONS.PROJECT_WRITE_ALL,
    ]);
  const standardEffortReadOnly = isAuthzEnabled && !canWriteStandardEffort;
  const legacyEstimatorReadOnly = isAuthzEnabled && !canWriteProject;
  const currentProject =
    page.currentProject ||
    page.projectSelector.projects.find(
      (project) => String(project.id) === String(page.projectSelector.projectId || "")
    ) ||
    null;
  const isArchivedCurrentProject =
    page.isCurrentProjectArchived || isArchivedProject(currentProject);
  const standardEffortEffectiveReadOnly =
    standardEffortReadOnly || isArchivedCurrentProject;
  const legacyEstimatorEffectiveReadOnly =
    legacyEstimatorReadOnly || isArchivedCurrentProject;
  const auditActor = {
    actorUserId: user?.user_id || authz.user?.user_id || null,
    actorEmail: user?.email || authz.user?.email || null,
    devOnly: Boolean(devOnly),
  };

  useAutoSave();

  return (
    <>
      <div className="mx-auto w-full max-w-[1680px] p-4">
        <div className="space-y-3">
          <HeaderBar
            projectMeta={page.projectMeta}
            status={page.status}
            actions={page.actions}
          />

          <ProjectSelectorBar
            projects={page.projectSelector.projects}
            projectId={page.projectSelector.projectId}
            loadProject={page.projectSelector.loadProject}
            refreshProjects={page.projectSelector.refreshProjects}
            dbReady={page.projectSelector.dbReady}
            isBusy={page.projectSelector.isBusy}
          />

          {!standardEffortMode.isStandardMode &&
          standardEffortMode.showLegacyEstimator ? (
            <LegacyEstimatorHeader page={page} />
          ) : null}
        </div>

        {isArchivedCurrentProject ? <ArchivedProjectNotice /> : null}

        {standardEffortMode.isStandardMode &&
        standardEffortMode.showStandardEstimator ? (
          <>
            <StandardModeNotice
              isStandardExportAvailable={isStandardExportAvailable}
            />
            <StandardEffortBlock
              page={page}
              readOnly={standardEffortEffectiveReadOnly}
              auditActor={auditActor}
            />

            <details className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-extrabold text-slate-800">
                기존 산출 화면
              </summary>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                신규 표준공수 산식 전환 전 비교용 화면입니다. 이 영역은
                숨김이 아니라 비교용으로 보존되어 있으며 필요 시 펼쳐 확인할
                수 있습니다.
              </p>
              <div className="mt-3 space-y-3">
                <LegacyEstimatorHeader page={page} />
                <LegacyEstimatorBody
                  page={page}
                  readOnly={legacyEstimatorEffectiveReadOnly}
                  hideRightSidebar={
                    standardEffortMode.shouldHideLegacyRightSidebar
                  }
                />
              </div>
            </details>
          </>
        ) : (
          <>
            {standardEffortMode.showLegacyEstimator ? (
              <LegacyEstimatorBody
                page={page}
                readOnly={legacyEstimatorEffectiveReadOnly}
              />
            ) : null}

            {standardEffortMode.showStandardEstimator ? (
              <StandardEffortBlock
                page={page}
                readOnly={standardEffortEffectiveReadOnly}
                auditActor={auditActor}
              />
            ) : null}
          </>
        )}

        <div className="pt-3 text-center text-xs text-slate-400">
          짤 2026 Contact Center Estimation Workspace 쨌 Internal Planning Use 쨌{" "}
          {appVersion}
        </div>
      </div>

      <VersionHistoryModal
        isOpen={page.isVersionModalOpen}
        onClose={() => page.setIsVersionModalOpen(false)}
        versions={page.versions}
        isLoading={page.isVersionsBusy}
        onRestore={page.handleRestoreVersion}
      />
    </>
  );
}
