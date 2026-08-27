"use client";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, House } from "lucide-react";

export default function Breadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, i) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    path: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        aria-label="Go back"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 rounded-md px-1 py-1 text-gray-500 transition-colors hover:text-gray-900"
        >
          <House size={14} />
          <span className="text-sm">Home</span>
        </button>

        {crumbs.map((crumb, i) => (
          <div key={crumb.path} className="flex items-center gap-1">
            <ChevronRight size={16} className="text-gray-400" />
            {i === crumbs.length - 1 ? (
              <span className="text-sm font-semibold text-gray-900">{crumb.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => router.push(crumb.path)}
                className="rounded-md px-1 py-1 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
              >
                {crumb.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
