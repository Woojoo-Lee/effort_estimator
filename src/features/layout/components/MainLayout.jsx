import React from "react";
import AppSidebar from "./AppSidebar";

export default function MainLayout({ activeRoute, children }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fc_180px,#f5f7fb_100%)]">
      <div className="flex min-h-screen">
        <AppSidebar activeRoute={activeRoute} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
