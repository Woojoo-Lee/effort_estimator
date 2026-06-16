import React from "react";
import AppSidebar from "./AppSidebar";
import { useAuthSession } from "../../auth";

function AccountBar() {
  const authSession = useAuthSession();

  if (!authSession.requireLogin || !authSession.isAuthenticated) {
    return null;
  }

  const currentUserLabel =
    authSession.user?.display_name ||
    authSession.user?.login_id ||
    "로그인됨";

  return (
    <div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white/90 px-6 py-3">
      <span
        data-testid="global-auth-user"
        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
      >
        {currentUserLabel}
      </span>
      <button
        type="button"
        onClick={authSession.signOut}
        disabled={authSession.loading}
        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        로그아웃
      </button>
    </div>
  );
}

export default function MainLayout({ activeRoute, children }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)]">
      <div className="flex min-h-screen">
        <AppSidebar activeRoute={activeRoute} />
        <main className="min-w-0 flex-1">
          <AccountBar />
          {children}
        </main>
      </div>
    </div>
  );
}
