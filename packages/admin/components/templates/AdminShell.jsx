// components/templates/AdminShell.jsx
"use client";
import { useEffect, useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AdminNav } from "../organisms/AdminNav.jsx";
import { Logo } from "../organisms/AdminNavLogo.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import Breadcrumb from "../molecules/Breadcrumb.jsx";
import { getEntities } from "../../lib/runtime.config.js";

export function AdminShell({ children }) {
  const [panel, setPanel] = useState(true); // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Close the drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Dynamically filter entities based on the user's role and the entity's roles array
  const entities = getEntities();
  const visibleEntities = Object.fromEntries(
    Object.entries(entities).filter(([_, entity]) => entity.roles?.includes(user?.role))
  );

  return (
    <div className="flex h-dvh bg-black-500 text-xs">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: drawer on mobile, static column on md+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col gap-1 border-r border-gray-200 bg-white p-3
          transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-all
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${panel ? "md:w-[220px]" : "md:w-[72px]"}`}
      >
        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={() => setPanel((prev) => !prev)}
          title={panel ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute top-8 -right-3.5 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900 focus:outline-none md:flex"
        >
          {panel ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <X size={18} />
        </button>

        <div className="px-1 py-2">
          {/* The drawer is always fully expanded on mobile */}
          <Logo panel={panel || mobileOpen} />
        </div>

        <div className="mt-2 h-px bg-gray-200" />

        <div className="mt-2 flex-1 overflow-y-auto">
          <AdminNav
            items={visibleEntities}
            panel={panel || mobileOpen}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-gray-50">
        {/* Top bar: sticky so the menu button is always reachable */}
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-3 py-2 sm:px-4 md:border-0 md:pt-4">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 md:hidden"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <Breadcrumb />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4 md:pr-4">
              <span className="rounded-sm border border-blue-500 bg-blue-50 px-2 py-1 text-xs text-blue-500">
                {user?.role?.toUpperCase() || "USER"}
              </span>
              <button
                type="button"
                className="wrapper-btn flex h-9 w-9 items-center justify-center md:h-auto md:w-auto"
                title="Logout"
                aria-label="Logout"
                onClick={logout}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="mx-auto flex w-full min-w-0 max-w-[1100px] flex-1 flex-col px-3 pb-4 pt-3 sm:px-4 md:pt-2">
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
