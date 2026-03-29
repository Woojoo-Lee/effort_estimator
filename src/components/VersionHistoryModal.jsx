import React from "react";

function formatDateText(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("ko-KR");
  } catch {
    return value;
  }
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  isLoading,
  onRestore,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">버전 이력</h2>
            <p className="mt-1 text-sm text-slate-500">
              수동 저장된 프로젝트 버전을 확인하고 복구할 수 있습니다.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              버전 목록을 불러오는 중입니다...
            </div>
          ) : versions.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              저장된 버전 이력이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => {
                const payload = version.payload || {};
                const savedAt = payload.savedAt || version.created_at;

                return (
                  <div
                    key={version.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                            버전 {version.version_no}
                          </span>

                          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">
                            {version.saved_type === "manual"
                              ? "수동 저장"
                              : "자동 저장"}
                          </span>
                        </div>

                        <div className="text-sm font-medium text-slate-800">
                          {version.project_name || payload.projectName || "이름 없음"}
                        </div>

                        <div className="text-xs text-slate-500">
                          저장 시각: {formatDateText(savedAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRestore(version)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                        >
                          이 버전 복구
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}