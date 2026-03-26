import React from "react";

export default function SmallSelect({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 ${
        props.className || ""
      }`}
    >
      {children}
    </select>
  );
}