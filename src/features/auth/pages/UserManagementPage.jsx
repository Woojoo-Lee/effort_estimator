import React, { useEffect, useState } from "react";

import UserManagementTable from "../components/UserManagementTable";
import { useAuthSession } from "../hooks/useAuthSession";
import { authUserAdminRepository } from "../services/authUserAdminRepository";

export default function UserManagementPage({
  repository = authUserAdminRepository,
}) {
  const authSession = useAuthSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const result = await repository.fetchAuthUsers();
      setUsers(result.users || []);
    } catch (loadError) {
      setError(loadError?.message || "사용자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSave(user, draft) {
    const result = await repository.updateAuthUser({
      userId: user.user_id,
      displayName: draft.display_name,
      roleCode: draft.role_code,
      active: draft.active,
    });
    const updatedUser = result.user;

    setUsers((current) =>
      current.map((row) =>
        row.user_id === updatedUser.user_id ? updatedUser : row
      )
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] p-4">
      <section className="mb-4">
        <h1 className="text-xl font-extrabold text-slate-900">사용자 관리</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          ID/PW 로그인 사용자의 표시명, 역할, 활성 상태를 관리합니다.
        </p>
      </section>

      <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        <p>
          비밀번호 초기화는 관리자 수동 초기화 절차를 사용합니다. 화면에는
          비밀번호나 해시 값을 표시하지 않습니다.
        </p>
      </section>

      {error ? (
        <section className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
          사용자 목록을 불러오는 중입니다.
        </section>
      ) : (
        <UserManagementTable
          currentUserId={authSession.user?.user_id}
          users={users}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
