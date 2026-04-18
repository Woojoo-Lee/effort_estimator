import React, { forwardRef } from "react";

const SmallInput = forwardRef(function SmallInput(
  {
    type = "text",
    className = "",
    onFocus,
    onWheel,
    ...props
  },
  ref
) {
  const isNumber = type === "number";

  return (
    <input
      ref={ref}
      type={type}
      onFocus={(e) => {
        if (isNumber) {
          e.target.select();
        }
        onFocus?.(e);
      }}
      onWheel={(e) => {
        if (isNumber) {
          e.currentTarget.blur();
        }
        onWheel?.(e);
      }}
      className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 ${
        isNumber ? "no-spinner" : ""
      } ${className}`}
      {...props}
    />
  );
});

export default SmallInput;