import React, { useState } from "react";

import {
  StandardBaseEffortGrid,
  StandardCoefficientGrid,
  StandardEffortMetaSummary,
  StandardEffortMetaTabs,
} from "../components";
import useStandardEffortMetaAdmin from "../hooks/useStandardEffortMetaAdmin";
import {
  canAccessRoute,
  isAuthPermissionEnabled,
  PERMISSIONS,
  useAuthPermission,
} from "../../auth";
import { STANDARD_EFFORT_META_ROUTE } from "../../../app/routes";

function isFeatureEnabled() {
  return import.meta.env.VITE_FEATURE_STANDARD_EFFORT_META === "true";
}

function UnavailableState() {
  return (
    <div className="mx-auto max-w-[1360px] p-4">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
        사용할 수 없는 기능입니다.
      </div>
    </div>
  );
}

function AccessDeniedState() {
  return (
    <div className="mx-auto max-w-[1360px] p-4">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-extrabold text-slate-900">
          접근 권한이 없습니다.
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          필요한 권한이 없거나 비활성화된 기능입니다.
        </p>
      </div>
    </div>
  );
}

function ReadOnlyNotice({
  canWriteBaseEffort,
  canWriteCoefficient,
  canWriteActive,
}) {
  if (canWriteBaseEffort && canWriteCoefficient && canWriteActive) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
      현재 계정은 표준공수 메타를 조회할 수 있지만 일부 수정 권한은 제한되어
      있습니다.
    </div>
  );
}

function StandardEffortMetaContent({
  canWriteBaseEffort = true,
  canWriteCoefficient = true,
  canWriteActive = true,
  auditActor,
}) {
  const [activeTab, setActiveTab] = useState("baseEffort");
  const {
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
  } = useStandardEffortMetaAdmin({ auditActor });

  return (
    <div className="mx-auto w-full max-w-none space-y-4 px-3 py-4 sm:px-4 lg:px-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              표준공수 메타 관리
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              표준공수 산출 기준이 되는 솔루션별 기본공수(M/M), 기능항목,
              항목별 계수를 관리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            새로고침
          </button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          표준공수 메타를 불러오는 중입니다.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <ReadOnlyNotice
        canWriteBaseEffort={canWriteBaseEffort}
        canWriteCoefficient={canWriteCoefficient}
        canWriteActive={canWriteActive}
      />

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <StandardEffortMetaTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "baseEffort" ? (
          <StandardBaseEffortGrid
            solutionVariants={meta.solutionVariants}
            baseEffortRows={meta.baseEffortRows}
            baseEffortDrafts={baseEffortDrafts}
            baseEffortDirtyMap={baseEffortDirtyMap}
            baseEffortSavingMap={baseEffortSavingMap}
            baseEffortErrorMap={baseEffortErrorMap}
            baseEffortSavedMap={baseEffortSavedMap}
            variantActiveSavingMap={variantActiveSavingMap}
            variantActiveErrorMap={variantActiveErrorMap}
            variantActiveSavedMap={variantActiveSavedMap}
            onChangeBaseEffortDraft={updateBaseEffortDraft}
            onResetBaseEffortDraft={resetBaseEffortDraft}
            onSaveBaseEffortRow={saveBaseEffortRow}
            onToggleSolutionVariantActive={toggleSolutionVariantActive}
            readOnlyBaseEffort={!canWriteBaseEffort}
            readOnlyActive={!canWriteActive}
          />
        ) : null}

        {activeTab === "coefficients" ? (
          <StandardCoefficientGrid
            solutionVariants={meta.solutionVariants}
            itemRows={meta.itemRows}
            coefficientRows={meta.coefficientRows}
            coefficientDrafts={coefficientDrafts}
            coefficientDirtyMap={coefficientDirtyMap}
            coefficientSavingMap={coefficientSavingMap}
            coefficientErrorMap={coefficientErrorMap}
            coefficientSavedMap={coefficientSavedMap}
            itemActiveSavingMap={itemActiveSavingMap}
            itemActiveErrorMap={itemActiveErrorMap}
            itemActiveSavedMap={itemActiveSavedMap}
            onChangeCoefficientDraft={updateCoefficientDraft}
            onResetCoefficientDraft={resetCoefficientDraft}
            onSaveCoefficientRow={saveCoefficientRow}
            onToggleStandardItemActive={toggleStandardItemActive}
            readOnlyCoefficient={!canWriteCoefficient}
            readOnlyActive={!canWriteActive}
          />
        ) : null}

        {activeTab === "summary" ? (
          <StandardEffortMetaSummary summary={summary} />
        ) : null}
      </section>
    </div>
  );
}

export default function StandardEffortMetaPage() {
  const { authz, user, devOnly } = useAuthPermission();
  const authPermissionEnabled = isAuthPermissionEnabled(import.meta.env);

  if (!isFeatureEnabled()) {
    return <UnavailableState />;
  }

  if (
    !canAccessRoute(STANDARD_EFFORT_META_ROUTE, authz, {
      env: import.meta.env,
    })
  ) {
    return <AccessDeniedState />;
  }

  const canWriteBaseEffort =
    !authPermissionEnabled ||
    authz.hasPermission(PERMISSIONS.STANDARD_EFFORT_META_BASE_EFFORT_WRITE);
  const canWriteCoefficient =
    !authPermissionEnabled ||
    authz.hasPermission(PERMISSIONS.STANDARD_EFFORT_META_COEFFICIENT_WRITE);
  const canWriteActive =
    !authPermissionEnabled ||
    authz.hasPermission(PERMISSIONS.STANDARD_EFFORT_META_ACTIVE_WRITE);
  const auditActor = {
    actorUserId: authz.user?.user_id || user?.user_id || null,
    actorEmail: authz.user?.email || user?.email || null,
    devOnly: Boolean(devOnly),
  };

  return (
    <StandardEffortMetaContent
      canWriteBaseEffort={canWriteBaseEffort}
      canWriteCoefficient={canWriteCoefficient}
      canWriteActive={canWriteActive}
      auditActor={auditActor}
    />
  );
}
