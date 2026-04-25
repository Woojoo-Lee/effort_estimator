import React, { useState } from "react";

import ActionButton from "../../../shared/ui/ActionButton";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ProjectList({
  projects = [],
  currentProjectId,
  selectProject,
  deleteProject,
  refreshProjects,
  disabled = false,
}) {
  const [confirmingProjectId, setConfirmingProjectId] = useState(null);

  function handleDeleteClick(project) {
    setConfirmingProjectId(project.id);
  }

  async function handleConfirmDelete(project) {
    await deleteProject(project.id);
    setConfirmingProjectId(null);
  }

  function handleCancelDelete() {
    setConfirmingProjectId(null);
  }

  if (projects.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="text-base font-extrabold text-slate-800">
          ?꾨줈?앺듃媛 ?놁뒿?덈떎
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-500">
          ?꾨줈?앺듃紐낆쓣 ?낅젰?????곗젙 ?꾨줈?앺듃瑜??쒖옉?섏꽭??
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <div className="text-sm font-extrabold text-slate-900">
            ?꾨줈?앺듃 紐⑸줉
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-400">
            ?꾩껜 {projects.length}嫄?          </div>
        </div>
        <ActionButton onClick={refreshProjects} disabled={disabled}>
          ?덈줈怨좎묠
        </ActionButton>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3">프로젝트명</th>
              <th className="px-4 py-3">수정일</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-6 py-3 text-right">?묒뾽</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const isCurrent =
                String(project.id) === String(currentProjectId || "");
              const isConfirming =
                String(confirmingProjectId || "") === String(project.id);

              return (
                <tr
                  key={project.id}
                  className={`border-b border-slate-100 last:border-b-0 ${
                    isCurrent ? "bg-blue-50/70" : "bg-white"
                  }`}
                >
                  <td className="max-w-[360px] px-6 py-4">
                    <button
                      type="button"
                      onClick={() => selectProject(project.id)}
                      disabled={disabled}
                      className="block max-w-full truncate text-left font-extrabold text-slate-900 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {project.project_name || `Project ${project.id}`}
                    </button>
                    {isCurrent && (
                      <div className="mt-1 text-xs font-bold text-blue-600">
                        ?꾩옱 ?좏깮??                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">
                    {formatDate(project.updated_at)}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-4 font-mono text-xs text-slate-400">
                    {project.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        onClick={() => selectProject(project.id)}
                        disabled={disabled}
                      >
                        {disabled ? "불러오는 중..." : "선택"}
                      </ActionButton>
                      {isConfirming ? (
                        <>
                          <ActionButton
                            onClick={() => handleConfirmDelete(project)}
                            disabled={disabled}
                          >
                            ?뺣쭚 ??젣
                          </ActionButton>
                          <ActionButton
                            onClick={handleCancelDelete}
                            disabled={disabled}
                          >
                            痍⑥냼
                          </ActionButton>
                        </>
                      ) : (
                        <ActionButton
                          onClick={() => handleDeleteClick(project)}
                          disabled={disabled}
                        >
                          ??젣
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
