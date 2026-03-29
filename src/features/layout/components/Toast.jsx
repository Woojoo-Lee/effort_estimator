import React from "react";

export default function Toast({ message, tone = "blue" }) {
  if (!message) return null;

  const classes =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg ${classes}`}
    >
      {message}
    </div>
  );
}