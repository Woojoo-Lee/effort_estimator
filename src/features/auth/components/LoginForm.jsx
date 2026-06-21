import React, { useState } from "react";

const TEXT = {
  loginId: "\uC0AC\uC6A9\uC790 ID",
  password: "Password",
  login: "\uB85C\uADF8\uC778",
  loginPending: "\uB85C\uADF8\uC778 \uC911...",
  fallbackError:
    "\uC0AC\uC6A9\uC790 ID \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
};

export default function LoginForm({ error = null, loading = false, onSubmit }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const message = submitError || error?.message || "";
  const isLoginPending = loading || isSubmitting;
  const disabled = isLoginPending || !loginId.trim() || !password;

  async function handleSubmit(event) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await onSubmit?.({
        loginId: loginId.trim(),
        password,
      });
    } catch (submitFailure) {
      setSubmitError(submitFailure?.message || TEXT.fallbackError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="text-sm font-bold text-slate-700" htmlFor="login-id">
          {TEXT.loginId}
        </label>
        <input
          id="login-id"
          aria-label={TEXT.loginId}
          autoComplete="username"
          className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          type="text"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          disabled={isLoginPending}
        />
      </div>

      <div>
        <label
          className="text-sm font-bold text-slate-700"
          htmlFor="login-password"
        >
          {TEXT.password}
        </label>
        <input
          id="login-password"
          aria-label={TEXT.password}
          autoComplete="current-password"
          className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoginPending}
        />
      </div>

      {message ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={disabled}
        aria-busy={isLoginPending}
        className="h-10 w-full rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isLoginPending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin"
            />
            <span role="status">{TEXT.loginPending}</span>
          </span>
        ) : (
          TEXT.login
        )}
      </button>
    </form>
  );
}
