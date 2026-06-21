import React, { useState } from "react";
import AppSidebar from "./AppSidebar";
import { useAuthSession } from "../../auth";

const TEXT = {
  passwordChange: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD",
  currentPassword: "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638",
  newPassword: "\uC0C8 \uBE44\uBC00\uBC88\uD638",
  newPasswordConfirm: "\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778",
  mismatch:
    "\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  failure:
    "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  cancel: "\uCDE8\uC18C",
  change: "\uBCC0\uACBD",
  fallbackUser: "\uB85C\uADF8\uC778 \uC0AC\uC6A9\uC790",
  logout: "\uB85C\uADF8\uC544\uC6C3",
};

function PasswordChangePanel({ authSession, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (newPassword !== newPasswordConfirm) {
      setError(TEXT.mismatch);
      return;
    }

    try {
      setIsSubmitting(true);
      await authSession.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirm,
      });
    } catch (changeError) {
      setError(changeError?.message || TEXT.failure);
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="absolute right-6 top-[52px] z-40 w-[360px] rounded-lg border border-slate-200 bg-white p-4 text-left shadow-lg"
      onSubmit={handleSubmit}
    >
      <div className="text-sm font-extrabold text-slate-900">
        {TEXT.passwordChange}
      </div>
      <div className="mt-3 space-y-3">
        <label className="block text-xs font-bold text-slate-600">
          {TEXT.currentPassword}
          <input
            aria-label={TEXT.currentPassword}
            autoComplete="current-password"
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          {TEXT.newPassword}
          <input
            aria-label={TEXT.newPassword}
            autoComplete="new-password"
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          {TEXT.newPasswordConfirm}
          <input
            aria-label={TEXT.newPasswordConfirm}
            autoComplete="new-password"
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            type="password"
            value={newPasswordConfirm}
            onChange={(event) => setNewPasswordConfirm(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {error}
        </div>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting || authSession.loading}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {TEXT.cancel}
        </button>
        <button
          type="submit"
          disabled={
            isSubmitting ||
            authSession.loading ||
            !currentPassword ||
            !newPassword ||
            !newPasswordConfirm
          }
          className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {TEXT.change}
        </button>
      </div>
    </form>
  );
}

function AccountBar() {
  const authSession = useAuthSession();
  const [isPasswordPanelOpen, setIsPasswordPanelOpen] = useState(false);

  if (!authSession.requireLogin || !authSession.isAuthenticated) {
    return null;
  }

  const currentUserLabel =
    authSession.user?.display_name ||
    authSession.user?.login_id ||
    TEXT.fallbackUser;

  return (
    <div className="relative flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-white/95 px-6 py-3">
      <span
        data-testid="global-auth-user"
        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
      >
        {currentUserLabel}
      </span>
      <button
        type="button"
        onClick={() => setIsPasswordPanelOpen((current) => !current)}
        disabled={authSession.loading}
        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {TEXT.passwordChange}
      </button>
      <button
        type="button"
        onClick={authSession.signOut}
        disabled={authSession.loading}
        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {TEXT.logout}
      </button>
      {isPasswordPanelOpen ? (
        <PasswordChangePanel
          authSession={authSession}
          onClose={() => setIsPasswordPanelOpen(false)}
        />
      ) : null}
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
