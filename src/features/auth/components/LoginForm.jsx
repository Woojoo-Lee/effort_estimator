import React, { useState } from "react";

export default function LoginForm({ error = null, loading = false, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const message = submitError || error?.message || "";
  const disabled = loading || !email.trim() || !password;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    try {
      await onSubmit?.({
        email: email.trim(),
        password,
      });
    } catch (submitFailure) {
      setSubmitError(submitFailure?.message || "Login failed.");
    }
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="text-sm font-bold text-slate-700" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          aria-label="Email"
          autoComplete="email"
          className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
