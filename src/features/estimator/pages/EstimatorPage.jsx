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
import { useAppPageModel } from "../../../app/useAppPageModel";
import { PERMISSIONS, isAuthPermissionEnabled, useAuthPermission } from "../../auth";
import { buildRowHistoryActor } from "../../auth/lib/rowHistoryActor";
import { canManageProject } from "../../projects/lib/projectAccessPolicy";
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

function ProjectSelectionNotice() {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
      <p className="font-extrabold">프로젝트를 선택해 주세요.</p>
      <p className="mt-1 font-semibold text-slate-500">
        공수 산정 화면에서는 기존 프로젝트 선택과 표준공수 저장만 수행합니다.
        신규 프로젝트 생성과 기본 정보 수정은 프로젝트 관리 화면에서 진행해
        주세요.
      </p>
    </div>
  );
}

function EstimatorTitleBar() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <h1 className="text-xl font-bold text-slate-800">공수 산정</h1>
    </div>
  );
}

function CompactProjectSelectionNotice() {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm">
      프로젝트를 선택해 주세요.
    </div>
  );
}

function StandardEffortBlock({
  page,
  readOnly = false,
  solutionSelectionReadOnly = readOnly,
  itemSelectionReadOnly = readOnly,
  actualEffortReadOnly = readOnly,
  auditActor,
}) {
  return (
    <StandardEffortSection
      projectId={page.projectSelector.projectId}
      standardEffort={page.estimatorView.standardEffort}
      standardEffortActions={page.estimatorView.standardEffortActions}
      readOnly={readOnly}
      solutionSelectionReadOnly={solutionSelectionReadOnly}
      itemSelectionReadOnly={itemSelectionReadOnly}
      actualEffortReadOnly={actualEffortReadOnly}
      auditActor={auditActor}
    />
  );
}

export default function EstimatorPage() {
  const page = useAppPageModel();
  const { authz, user, devOnly } = useAuthPermission();
  const standardEffortMode = resolveStandardEffortMode(import.meta.env);
  const projectLifecycleEnabled = !standardEffortMode.isStandardMode;
  const isAuthzEnabled = isAuthPermissionEnabled(import.meta.env);
  const currentProject =
    page.currentProject ||
    page.projectSelector.projects.find(
      (project) => String(project.id) === String(page.projectSelector.projectId || "")
    ) ||
    null;
  const currentActor = user || authz.user || null;
  const canManageCurrentProject =
    !isAuthzEnabled ||
    !page.projectSelector.projectId ||
    canManageProject(currentProject || {}, {
      authz,
      user: currentActor,
    });
  const canWriteSolutionSelection =
    !isAuthzEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.STANDARD_EFFORT_SOLUTION_WRITE,
      PERMISSIONS.STANDARD_EFFORT_SELECTION_WRITE,
    ]);
  const canWriteItemSelection =
    !isAuthzEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.STANDARD_EFFORT_ITEM_WRITE,
      PERMISSIONS.STANDARD_EFFORT_SELECTION_WRITE,
    ]);
  const canWriteActualEffort =
    !isAuthzEnabled ||
    authz.hasPermission(PERMISSIONS.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE);
  const canWriteProject =
    !isAuthzEnabled ||
    authz.hasAnyPermission([
      PERMISSIONS.PROJECT_WRITE_OWN,
      PERMISSIONS.PROJECT_WRITE_ASSIGNED,
      PERMISSIONS.PROJECT_WRITE_ALL,
    ]);
  const standardEffortReadOnly =
    isAuthzEnabled &&
    ((!canWriteSolutionSelection && !canWriteItemSelection) ||
      !canManageCurrentProject);
  const solutionSelectionReadOnly =
    isAuthzEnabled && (!canWriteSolutionSelection || !canManageCurrentProject);
  const itemSelectionReadOnly =
    isAuthzEnabled && (!canWriteItemSelection || !canManageCurrentProject);
  const actualEffortReadOnly =
    isAuthzEnabled && (!canWriteActualEffort || !canManageCurrentProject);
  const legacyEstimatorReadOnly =
    isAuthzEnabled && (!canWriteProject || !canManageCurrentProject);
  const isArchivedCurrentProject =
    page.isCurrentProjectArchived || isArchivedProject(currentProject);
  const standardEffortEffectiveReadOnly =
    standardEffortReadOnly || isArchivedCurrentProject;
  const solutionSelectionEffectiveReadOnly =
    solutionSelectionReadOnly || isArchivedCurrentProject;
  const itemSelectionEffectiveReadOnly =
    itemSelectionReadOnly || isArchivedCurrentProject;
  const actualEffortEffectiveReadOnly =
    actualEffortReadOnly || isArchivedCurrentProject;
  const legacyEstimatorEffectiveReadOnly =
    legacyEstimatorReadOnly ||
    isArchivedCurrentProject ||
    standardEffortMode.isStandardMode;
  const auditActor = {
    actorUserId: user?.user_id || authz.user?.user_id || null,
    actorEmail: user?.email || authz.user?.email || null,
    devOnly: Boolean(devOnly),
  };
  const standardEffortSaveActor = buildRowHistoryActor(currentActor);
  const standardEffortSaveOptions = standardEffortSaveActor
    ? { currentUser: standardEffortSaveActor }
    : {};
  const handleSaveStandardEffort = () =>
    page.estimatorView.standardEffortActions.saveStandardEffortChanges(
      page.projectSelector.projectId,
      standardEffortSaveOptions
    );

  useAutoSave({ enabled: projectLifecycleEnabled });

  return (
    <>
      <div className="mx-auto w-full max-w-[1680px] p-4">
        <div className="space-y-3">
          {projectLifecycleEnabled ? (
            <HeaderBar
              projectMeta={page.projectMeta}
              status={page.status}
              actions={page.actions}
              projectLifecycleEnabled={projectLifecycleEnabled}
            />
          ) : (
            <EstimatorTitleBar />
          )}

          <ProjectSelectorBar
            projects={page.projectSelector.projects}
            projectId={page.projectSelector.projectId}
            loadProject={page.projectSelector.loadProject}
            refreshProjects={page.projectSelector.refreshProjects}
            dbReady={page.projectSelector.dbReady}
            isBusy={page.projectSelector.isBusy}
            downloadExcel={page.actions.downloadExcel}
            canDownloadExcel={
              page.status.actionPermissions?.canExport !== false
            }
            showExcelButton={!projectLifecycleEnabled}
            standardEffortLastChange={
              page.estimatorView.standardEffort.lastChange
            }
            standardEffortLastChangeLoading={
              page.estimatorView.standardEffort.lastChangeLoading
            }
            showStandardEffortSaveButton={standardEffortMode.isStandardMode}
            onSaveStandardEffort={handleSaveStandardEffort}
            canSaveStandardEffort={!standardEffortEffectiveReadOnly}
            standardEffortDirty={page.estimatorView.standardEffort.dirty}
            standardEffortSaving={page.estimatorView.standardEffort.saving}
            standardEffortSaveError={page.estimatorView.standardEffort.saveError}
            standardEffortSaveMessage={
              page.estimatorView.standardEffort.saveMessage
            }
          />

          {!standardEffortMode.isStandardMode &&
          standardEffortMode.showLegacyEstimator ? (
            <LegacyEstimatorHeader page={page} />
          ) : null}
        </div>

        {isArchivedCurrentProject ? <ArchivedProjectNotice /> : null}
        {standardEffortMode.isStandardMode && !page.projectSelector.projectId ? (
          <CompactProjectSelectionNotice />
        ) : null}

        {standardEffortMode.isStandardMode &&
        standardEffortMode.showStandardEstimator ? (
          <StandardEffortBlock
            page={page}
            readOnly={standardEffortEffectiveReadOnly}
            solutionSelectionReadOnly={solutionSelectionEffectiveReadOnly}
            itemSelectionReadOnly={itemSelectionEffectiveReadOnly}
            actualEffortReadOnly={actualEffortEffectiveReadOnly}
            auditActor={auditActor}
          />
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
                solutionSelectionReadOnly={solutionSelectionEffectiveReadOnly}
                itemSelectionReadOnly={itemSelectionEffectiveReadOnly}
                actualEffortReadOnly={actualEffortEffectiveReadOnly}
                auditActor={auditActor}
              />
            ) : null}
          </>
        )}
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
