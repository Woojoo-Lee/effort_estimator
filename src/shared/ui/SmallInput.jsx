import React from "react";

export default function SmallInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 ${
        props.className || ""
      }`}
    />
  );
}