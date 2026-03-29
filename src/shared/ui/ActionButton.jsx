import React from "react";

export default function ActionButton({ children, primary = false, ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        primary
          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-300"
      } ${props.className || ""}`}
    >
      {children}
    </button>
  );
}