import React from "react";
import { APP_ROUTES } from "../../../app/routes";

export default function AppSidebar({ activeRoute }) {
  return (
    <aside className="flex min-h-screen w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="text-sm font-extrabold text-slate-900">
          Effort Estimator
        </div>
        <div className="mt-1 text-xs text-slate-500">업무 관리</div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {APP_ROUTES.map((route) => {
          const isActive = activeRoute === route.path;

          return (
            <a
              key={route.path}
              href={`#${route.path}`}
              className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {route.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
