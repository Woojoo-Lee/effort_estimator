import React, { useEffect, useState } from "react";

const TEXT = {
  title: "\uACF5\uC218 \uC0B0\uC815",
  noProject: "\uD504\uB85C\uC81D\uD2B8 \uBBF8\uC120\uD0DD",
  savedAt: "\uC800\uC7A5\uC77C",
  dbOffline: "DB \uBBF8\uC5F0\uACB0",
  dirty: "\uC218\uC815\uB428",
  saving: "\uC800\uC7A5 \uC911...",
  saved: "\uC800\uC7A5\uB428",
  saveError: "\uC800\uC7A5 \uC2E4\uD328",
  busy: "\uCC98\uB9AC \uC911...",
  projectName: "\uD504\uB85C\uC81D\uD2B8\uBA85",
  projectNamePlaceholder:
    "\uD504\uB85C\uC81D\uD2B8\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694",
  selectedProject: "\uC120\uD0DD\uD55C \uD504\uB85C\uC81D\uD2B8",
  selectExisting:
    "\uAE30\uC874 \uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.",
  projectManagementHint:
    "\uD504\uB85C\uC81D\uD2B8 \uC0DD\uC131\uACFC \uAE30\uBCF8 \uC815\uBCF4 \uC218\uC815\uC740 \uD504\uB85C\uC81D\uD2B8 \uAD00\uB9AC \uD654\uBA74\uC5D0\uC11C \uC218\uD589\uD569\uB2C8\uB2E4.",
  newProject: "\uC2E0\uADDC",
  versionHistory: "\uBC84\uC804 \uBCF4\uAE30",
  save: "\uC800\uC7A5",
  projectManagement: "\uD504\uB85C\uC81D\uD2B8 \uAD00\uB9AC",
  excel: "Excel \uB2E4\uC6B4\uB85C\uB4DC",
  reset: "\uCD08\uAE30\uD654",
  print: "\uC778\uC1C4",
  permissionDenied:
    "\uAD8C\uD55C\uC774 \uC5C6\uC5B4 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  archivedReadOnly:
    "\uBCF4\uAD00\uB41C \uD504\uB85C\uC81D\uD2B8\uB294 \uC218\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
};

function StatusBadge({ children, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-600",
  };

  return (
    <span
      className={`animate-fadeIn rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300 ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function SecondaryButton({ children, onClick, disabled = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function AccentButton({
  children,
  onClick,
  disabled = false,
  tone = "blue",
  title,
}) {
  const toneClass = {
    blue: "bg-blue-600 hover:bg-blue-700",
    violet: "bg-violet-600 hover:bg-violet-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-10 rounded-lg px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass[tone]}`}
    >
      {children}
    </button>
  );
}

function openProjectManagement() {
  window.location.hash = "/projects";
}

export default function HeaderBar({
  projectMeta,
  status,
  actions,
  projectLifecycleEnabled = true,
}) {
  const { projectId, projectName, savedAt } = projectMeta;
  const { dbReady, isBusy, saveStatus, actionPermissions = {} } = status;
  const canWriteProject = actionPermissions.canWriteProject !== false;
  const canExport = actionPermissions.canExport !== false;
  const canPrint = actionPermissions.canPrint !== false;
  const isProjectReadOnly = actionPermissions.isProjectReadOnly === true;
  const canModifyCurrentProject = canWriteProject && !isProjectReadOnly;
  const readOnlyTitle = actionPermissions.isArchivedProject
    ? TEXT.archivedReadOnly
    : TEXT.permissionDenied;

  const {
    setProjectName,
    createNewProject,
    handleSaveProject,
    downloadExcel,
    resetAll,
    showPrint,
    openVersionHistory,
  } = actions;

  const [displayStatus, setDisplayStatus] = useState(saveStatus);

  useEffect(() => {
    if (saveStatus === "saved") {
      setDisplayStatus("saved");

      const timer = setTimeout(() => {
        setDisplayStatus("idle");
      }, 1500);

      return () => clearTimeout(timer);
    }

    setDisplayStatus(saveStatus);
  }, [saveStatus]);

  return (
    <div className="flex flex-col gap-4 rounded-t-2xl border border-slate-200 border-b-0 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{TEXT.title}</h1>

          <div className="mt-1 text-xs text-slate-400">
            {projectId ? `ID: ${projectId}` : TEXT.noProject}
            {savedAt ? ` / ${TEXT.savedAt}: ${savedAt}` : ""}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!dbReady ? <StatusBadge tone="red">{TEXT.dbOffline}</StatusBadge> : null}
          {displayStatus === "dirty" ? (
            <StatusBadge tone="amber">{TEXT.dirty}</StatusBadge>
          ) : null}
          {displayStatus === "saving" ? (
            <StatusBadge tone="blue">{TEXT.saving}</StatusBadge>
          ) : null}
          {displayStatus === "saved" ? (
            <StatusBadge tone="emerald">{TEXT.saved}</StatusBadge>
          ) : null}
          {displayStatus === "error" ? (
            <StatusBadge tone="red">{TEXT.saveError}</StatusBadge>
          ) : null}
          {isBusy ? <StatusBadge tone="slate">{TEXT.busy}</StatusBadge> : null}
        </div>
      </div>

      {projectLifecycleEnabled ? (
        <div className="flex items-center gap-3">
          <label className="shrink-0 text-sm font-medium text-slate-600">
            {TEXT.projectName}
          </label>

          <input
            type="text"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            disabled={isProjectReadOnly}
            title={isProjectReadOnly ? readOnlyTitle : undefined}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
            placeholder={TEXT.projectNamePlaceholder}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="text-xs font-bold text-slate-500">
            {TEXT.selectedProject}
          </div>
          <div className="mt-1 text-sm font-extrabold text-slate-900">
            {projectName || TEXT.selectExisting}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {TEXT.projectManagementHint}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-1">
        {projectLifecycleEnabled ? (
          <>
            <SecondaryButton
              onClick={createNewProject}
              disabled={!canWriteProject}
              title={!canWriteProject ? TEXT.permissionDenied : undefined}
            >
              {TEXT.newProject}
            </SecondaryButton>

            <AccentButton
              onClick={openVersionHistory}
              disabled={!projectId}
              tone="violet"
            >
              {TEXT.versionHistory}
            </AccentButton>

            <AccentButton
              onClick={handleSaveProject}
              disabled={!dbReady || isBusy || !canModifyCurrentProject}
              title={!canModifyCurrentProject ? readOnlyTitle : undefined}
              tone="blue"
            >
              {TEXT.save}
            </AccentButton>
          </>
        ) : (
          <SecondaryButton onClick={openProjectManagement}>
            {TEXT.projectManagement}
          </SecondaryButton>
        )}

        <SecondaryButton
          onClick={downloadExcel}
          disabled={!canExport}
          title={!canExport ? TEXT.permissionDenied : undefined}
        >
          {TEXT.excel}
        </SecondaryButton>

        {projectLifecycleEnabled ? (
          <SecondaryButton
            onClick={resetAll}
            disabled={!canModifyCurrentProject}
            title={!canModifyCurrentProject ? readOnlyTitle : undefined}
          >
            {TEXT.reset}
          </SecondaryButton>
        ) : null}

        <SecondaryButton
          onClick={showPrint}
          disabled={!canPrint}
          title={!canPrint ? TEXT.permissionDenied : undefined}
        >
          {TEXT.print}
        </SecondaryButton>
      </div>
    </div>
  );
}
