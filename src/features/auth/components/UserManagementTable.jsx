import React, { useEffect, useMemo, useState } from "react";

const ROLE_LABELS = {
  admin: "관리자",
  sales: "영업대표",
  viewer: "조회자",
};

const ROLE_OPTIONS = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "sales", label: ROLE_LABELS.sales },
  { value: "viewer", label: ROLE_LABELS.viewer },
];

function buildDrafts(users) {
  return Object.fromEntries(
    users.map((user) => [
      user.user_id,
      {
        display_name: user.display_name || "",
        role_code: user.role_code || "viewer",
        active: Boolean(user.active),
      },
    ])
  );
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserManagementTable({
  currentUserId,
  users,
  onSave,
}) {
  const initialDrafts = useMemo(() => buildDrafts(users), [users]);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [savingUserId, setSavingUserId] = useState("");
  const [messages, setMessages] = useState({});

  useEffect(() => {
    setDrafts(initialDrafts);
    setMessages({});
  }, [initialDrafts]);

  function updateDraft(userId, patch) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || {}),
        ...patch,
      },
    }));
    setMessages((current) => ({
      ...current,
      [userId]: "",
    }));
  }

  async function handleSave(user) {
    const draft = drafts[user.user_id] || {};
    setSavingUserId(user.user_id);
    setMessages((current) => ({
      ...current,
      [user.user_id]: "",
    }));

    try {
      await onSave(user, draft);
      setMessages((current) => ({
        ...current,
        [user.user_id]: "저장되었습니다.",
      }));
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [user.user_id]: error?.message || "저장에 실패했습니다.",
      }));
    } finally {
      setSavingUserId("");
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
        표시할 사용자가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">사용자 ID</th>
            <th className="px-4 py-3">표시명</th>
            <th className="px-4 py-3">역할</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">수정일시</th>
            <th className="px-4 py-3">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const draft = drafts[user.user_id] || {};
            const isSelf = user.user_id === currentUserId;
            const isDirty =
              draft.display_name !== (user.display_name || "") ||
              draft.role_code !== user.role_code ||
              draft.active !== Boolean(user.active);
            const isSaving = savingUserId === user.user_id;

            return (
              <tr key={user.user_id} className="align-top">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {user.login_id}
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`${user.login_id} 표시명`}
                    className="h-9 w-40 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={draft.display_name || ""}
                    onChange={(event) =>
                      updateDraft(user.user_id, {
                        display_name: event.target.value,
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`${user.login_id} 역할`}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={isSelf}
                    value={draft.role_code || "viewer"}
                    onChange={(event) =>
                      updateDraft(user.user_id, {
                        role_code: event.target.value,
                      })
                    }
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {isSelf ? (
                    <div className="mt-1 text-xs font-semibold text-slate-400">
                      본인 역할 변경 불가
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`${user.login_id} 상태`}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={isSelf}
                    value={draft.active ? "active" : "locked"}
                    onChange={(event) =>
                      updateDraft(user.user_id, {
                        active: event.target.value === "active",
                      })
                    }
                  >
                    <option value="active">활성</option>
                    <option value="locked">잠금</option>
                  </select>
                  {isSelf ? (
                    <div className="mt-1 text-xs font-semibold text-slate-400">
                      본인 잠금 불가
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateTime(user.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!isDirty || isSaving}
                      onClick={() => handleSave(user)}
                      className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {isSaving ? "저장 중..." : "저장"}
                    </button>
                    {isDirty ? (
                      <span className="text-xs font-semibold text-blue-600">
                        변경됨
                      </span>
                    ) : null}
                    {messages[user.user_id] ? (
                      <span className="text-xs font-semibold text-slate-600">
                        {messages[user.user_id]}
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
