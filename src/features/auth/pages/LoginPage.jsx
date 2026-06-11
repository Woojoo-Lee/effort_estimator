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

  if (authSession.loginMode !== AUTH_LOGIN_MODES.SUPABASE) {
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
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[480px] items-center p-4">
      <div className="w-full">
        <div className="mb-4">
          <h1 className="text-xl font-extrabold text-slate-900">
            Effort Estimator Login
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Sign in with a manually managed Supabase Auth account.
          </p>
        </div>
        <LoginForm
          error={authSession.error}
          loading={authSession.loading}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
