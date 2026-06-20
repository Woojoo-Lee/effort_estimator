import React, { useEffect } from "react";

import { DEFAULT_ROUTE } from "../../../app/routes";
import LoginForm from "../components/LoginForm";
import { AUTH_LOGIN_MODES } from "../lib/authLoginMode";
import { useAuthSession } from "../hooks/useAuthSession";

function navigateToDefaultRoute() {
  window.location.hash = DEFAULT_ROUTE;
}

export default function LoginPage() {
  const authSession = useAuthSession();

  useEffect(() => {
    if (authSession.isAuthenticated) {
      navigateToDefaultRoute();
    }
  }, [authSession.isAuthenticated]);

  async function handleSubmit(credentials) {
    await authSession.signIn(credentials);
    navigateToDefaultRoute();
  }

  if (authSession.loginMode !== AUTH_LOGIN_MODES.APP) {
    return (
      <div className="mx-auto max-w-[480px] p-4">
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">
            Login disabled
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            The app is currently using the existing no-login development mode.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full">
        <div className="mx-auto mb-4 max-w-[480px]">
          <h1 className="text-xl font-extrabold text-slate-900">
            Effort Estimator 로그인
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            발급받은 사용자 ID와 비밀번호로 접속해 주세요.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[480px]">
          {authSession.notice ? (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {authSession.notice}
            </div>
          ) : null}
          <LoginForm
            error={authSession.error}
            loading={authSession.loading}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
