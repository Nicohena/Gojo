import React from "react";
import { Sidebar } from "./Sidebar";

export const DashboardLayout = ({ children, footer }) => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#EBF3FB" }}>
      {/* Sidebar + content row */}
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      {/* Full-width footer slot */}
      {footer && <div className="w-full">{footer}</div>}
    </div>
  );
};
