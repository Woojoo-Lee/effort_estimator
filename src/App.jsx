import React from "react";

import HeaderBar from "./features/layout/components/HeaderBar";
import ProjectSelectorBar from "./features/projects/components/ProjectSelectorBar";
import DetailTable from "./features/estimator/components/DetailTable";
import RightSidebar from "./features/layout/components/RightSidebar";
import Toast from "./features/layout/components/Toast";
import SolutionTabs from "./features/estimator/components/SolutionTabs";
import SummaryView from "./features/estimator/components/SummaryView";
import VersionHistoryModal from "./features/projects/components/VersionHistoryModal";

import { useToastState } from "./hooks/useToastState";
import { useAutoSave } from "./hooks/useAutoSave";
import { getAppVersion } from "./shared/lib/appVersion";
import { useAppPageModel } from "./app/useAppPageModel";

function GlobalToast() {
  const toast = useToastState();
  return <Toast message={toast.message} tone={toast.tone} />;
}

export default function ContactCenterEffortEstimator() {
  const appVersion = getAppVersion();
  const page = useAppPageModel();

  useAutoSave();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)]">
      <div className="mx-auto max-w-[1360px] p-4">
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

          <SolutionTabs
            activeTab={page.estimatorView.activeTab}
            setActiveTab={page.estimatorView.setActiveTab}
          />
        </div>

        {page.estimatorView.activeTab === "summary" ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_340px] lg:items-stretch">
            <div className="min-w-0">
              <SummaryView
                solutionTotals={page.estimatorView.solutionTotals}
                grandBaseTotal={page.estimatorView.grandBaseTotal}
              />
            </div>

            <div className="min-w-0 lg:h-full">
              <RightSidebar {...page.estimatorView.sidebarModel} isSummary />
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_340px] lg:items-stretch">
            <div className="min-w-0 lg:h-full">
              <DetailTable
                activeTab={page.estimatorView.activeTab}
                currentItems={page.estimatorView.currentItems}
                updateItem={page.estimatorView.detailActions.updateItem}
                addItem={page.estimatorView.detailActions.addItem}
                removeItem={page.estimatorView.detailActions.removeItem}
              />
            </div>

            <div className="min-w-0 lg:h-full">
              <RightSidebar {...page.estimatorView.sidebarModel} />
            </div>
          </div>
        )}

        <div className="pt-3 text-center text-xs text-slate-400">
          © 2026 Contact Center Estimation Workspace · Internal Planning Use ·{" "}
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

      <GlobalToast />
    </div>
  );
}