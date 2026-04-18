import React from "react";

import HeaderBar from "../../layout/components/HeaderBar";
import ProjectSelectorBar from "../../projects/components/ProjectSelectorBar";
import DetailTable from "../components/DetailTable";
import RightSidebar from "../../layout/components/RightSidebar";
import SolutionTabs from "../components/SolutionTabs";
import SummaryView from "../components/SummaryView";
import VersionHistoryModal from "../../projects/components/VersionHistoryModal";

import { useAutoSave } from "../../../hooks/useAutoSave";
import { getAppVersion } from "../../../shared/lib/appVersion";
import { useAppPageModel } from "../../../app/useAppPageModel";

export default function EstimatorPage() {
  const appVersion = getAppVersion();
  const page = useAppPageModel();

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

          <SolutionTabs
            activeTab={page.estimatorView.activeTab}
            setActiveTab={page.estimatorView.setActiveTab}
          />
        </div>

        {page.estimatorView.activeTab === "summary" ? (
          <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_360px] xl:items-stretch">
            <div className="min-w-0">
              <SummaryView
                solutionTotals={page.estimatorView.solutionTotals}
                grandBaseTotal={page.estimatorView.grandBaseTotal}
              />
            </div>

            <div className="min-w-0 xl:h-full">
              <RightSidebar {...page.estimatorView.sidebarModel} isSummary />
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_360px] xl:items-stretch">
            <div className="min-w-0 xl:h-full">
              <DetailTable
                activeTab={page.estimatorView.activeTab}
                currentItems={page.estimatorView.currentItems}
                updateItem={page.estimatorView.detailActions.updateItem}
                addItem={page.estimatorView.detailActions.addItem}
                removeItem={page.estimatorView.detailActions.removeItem}
              />
            </div>

            <div className="min-w-0 xl:h-full">
              <RightSidebar {...page.estimatorView.sidebarModel} />
            </div>
          </div>
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
