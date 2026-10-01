// components/organisms/AdminNav.jsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function AdminNav({ items, panel, onNavigate }) {
  const pathname = usePathname();
  const visibleitems = {
    dashboard: {
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    ...items,
  };

  return (
    <ul className="flex flex-col gap-1">
      {Object.entries(visibleitems ?? {}).map(([key, value]) => {
        const isactive = pathname.startsWith("/admin/" + key);
        return (
          <li key={key} title={key} className="w-full outline-none">
            <Link href={`/admin/${key}`} onClick={onNavigate} className="block w-full">
              <div
                className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm font-medium transition-colors md:p-2 ${
                  isactive
                    ? "border-gray-200 bg-white text-gray-900 shadow-sm"
                    : "border-transparent text-gray-500 hover:bg-white hover:text-gray-900"
                } ${panel ? "" : "md:justify-center"}`}
              >
                <value.icon size={18} className={isactive ? "text-gray-900" : "text-gray-400"} />
                {panel && <span>{value.label}</span>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
