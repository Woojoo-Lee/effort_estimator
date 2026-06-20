import React, { useState } from "react";

export default function LoginForm({ error = null, loading = false, onSubmit }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const message = submitError || error?.message || "";
  const disabled = loading || !loginId.trim() || !password;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    try {
      await onSubmit?.({
        loginId: loginId.trim(),
        password,
      });
    } catch (submitFailure) {
      setSubmitError(
        submitFailure?.message || "사용자 ID 또는 비밀번호를 확인해 주세요."
      );
    }
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="text-sm font-bold text-slate-700" htmlFor="login-id">
          사용자 ID
        </label>
        <input
          id="login-id"
          aria-label="사용자 ID"
          autoComplete="username"
          className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          type="text"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
        />
      </div>

      <div>
        <label
          className="text-sm font-bold text-slate-700"
          htmlFor="login-password"
        >
          Password
        </label>
        <input
          id="login-password"
          aria-label="Password"
          autoComplete="current-password"
          className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
        className="h-10 w-full rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
