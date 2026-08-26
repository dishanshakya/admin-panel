"use client";

// src/contexts/ApiContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// src/lib/runtime.config.js
var _config = { apiBaseUrl: null, host: null, mediaRoute: "/media", entities: {} };
function setRuntimeConfig(config) {
  _config = { ..._config, ...config };
  console.log("Setting Admin configs: ", _config);
}
function getRuntimeConfig() {
  return _config;
}
function getHost() {
  return _config.host;
}
function getMediaRoute() {
  return _config.mediaRoute;
}
function getEntities() {
  return _config.entities;
}

// src/contexts/ApiContext.jsx
import { jsx } from "react/jsx-runtime";
var ApiContext = createContext(null);
function useGet(path) {
  const { apiBaseUrl: BASE_URL } = getRuntimeConfig();
  const [data, setData] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const fetch_ = useCallback(async () => {
    setLocalLoading(true);
    try {
      const res = await fetch(BASE_URL + path, { credentials: "include" });
      if (!res.ok) {
        const data2 = await res.json().catch(() => ({}));
        setData(data2);
        throw new Error(data2.message || `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  }, [path, BASE_URL]);
  useEffect(() => {
    fetch_();
  }, [fetch_]);
  return { data, isLoading: localLoading, mutate: fetch_ };
}
async function request(method, path, body, baseUrl) {
  const options = {
    method,
    credentials: "include",
    headers: {}
  };
  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }
  try {
    const res = await fetch(`${baseUrl}${path}`, options);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  } finally {
  }
}
function ApiProvider({ baseUrl, children }) {
  const router = useRouter();
  const handle = useCallback(
    async (fn, options = {}) => {
      try {
        const data = await fn();
        if (options.success) options.success(data);
        if (options.redirect) {
          await router.push(options.redirect);
        }
        return data;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [router]
  );
  const post = useCallback(
    (path, body, options) => handle(() => request("POST", path, body, baseUrl), options),
    [handle]
  );
  const patch = useCallback(
    (path, body, options) => handle(() => request("PATCH", path, body, baseUrl), options),
    [handle]
  );
  const del = useCallback(
    (path, options) => handle(() => request("DELETE", path, void 0, baseUrl), options),
    [handle]
  );
  const value = useMemo(() => ({ post, patch, del }), [post, patch, del]);
  return /* @__PURE__ */ jsx(ApiContext.Provider, { value, children });
}
function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside <ApiProvider>");
  return ctx;
}

// src/contexts/AuthContext.jsx
import { createContext as createContext2, useContext as useContext2, useEffect as useEffect2, useState as useState2 } from "react";
import { useRouter as useRouter2 } from "next/navigation";
import { jsx as jsx2 } from "react/jsx-runtime";
var AuthContext = createContext2();
function AuthProvider({ children }) {
  const [user, setUser] = useState2(null);
  const { data, isLoading } = useGet("/auth/me");
  const { post } = useApi();
  const router = useRouter2();
  useEffect2(() => {
    if (!data) return;
    if (!data.success) {
      setUser(null);
      router.push("/login");
      return;
    }
    setUser(data == null ? void 0 : data.user);
  }, [data]);
  const logout = async () => {
    const res = await post("/auth/logout");
    if (res == null ? void 0 : res.success) {
      setUser(null);
      router.push("/login");
    }
  };
  return /* @__PURE__ */ jsx2(AuthContext.Provider, { value: { user, isLoading, logout }, children });
}
var useAuth = () => useContext2(AuthContext);

// src/components/templates/AdminGate.jsx
import { useEffect as useEffect3 } from "react";
import { usePathname, useRouter as useRouter3 } from "next/navigation";
function AdminGate({ children }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const entities = getEntities();
  const router = useRouter3();
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[1];
  const currentPath = section ? `/admin/${section}` : "/admin/dashboard";
  const matched = section ? Object.values(entities).find((entity) => entity.route === currentPath) : null;
  const allowed2 = (matched == null ? void 0 : matched.roles) ? matched.roles.includes(user == null ? void 0 : user.role) : true;
  useEffect3(() => {
    if (isLoading || !user) return;
    if (!allowed2) {
      router.replace("/admin/dashboard");
    }
  }, [isLoading, user, allowed2, router]);
  if (isLoading || !user || !allowed2) return null;
  return children;
}

// src/contexts/ToastContext.jsx
import {
  createContext as createContext3,
  useCallback as useCallback2,
  useContext as useContext3,
  useRef,
  useState as useState3
} from "react";
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
var ToastContext = createContext3(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState3([]);
  const idRef = useRef(0);
  const addToast = useCallback2((message, type = "success", duration = 4e3) => {
    const id = ++idRef.current;
    const text = message instanceof Error ? message.message : String(message);
    setToasts((prev) => [...prev, { id, message: text, type, exiting: false }]);
    setTimeout(() => {
      setToasts(
        (prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t)
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 350);
    }, duration);
  }, []);
  const dismiss = useCallback2((id) => {
    setToasts(
      (prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t)
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  }, []);
  const success = useCallback2(
    (message, duration) => addToast(message, "success", duration),
    [addToast]
  );
  const error = useCallback2(
    (message, duration) => addToast(message, "error", duration),
    [addToast]
  );
  const info = useCallback2(
    (message, duration) => addToast(message, "info", duration),
    [addToast]
  );
  return /* @__PURE__ */ jsxs(ToastContext.Provider, { value: { success, error, info, addToast }, children: [
    children,
    /* @__PURE__ */ jsx3("div", { className: "toast-container", "aria-live": "polite", "aria-atomic": "false", children: toasts.map((toast) => /* @__PURE__ */ jsx3(Toast, { toast, onDismiss: dismiss }, toast.id)) })
  ] });
}
function Toast({ toast, onDismiss }) {
  const icons = {
    success: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 20 20", fill: "none", className: "toast-icon", children: [
      /* @__PURE__ */ jsx3("circle", { cx: "10", cy: "10", r: "9", stroke: "currentColor", strokeWidth: "1.5" }),
      /* @__PURE__ */ jsx3(
        "path",
        {
          d: "M6 10.5l2.5 2.5 5-5",
          stroke: "currentColor",
          strokeWidth: "1.75",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }
      )
    ] }),
    error: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 20 20", fill: "none", className: "toast-icon", children: [
      /* @__PURE__ */ jsx3("circle", { cx: "10", cy: "10", r: "9", stroke: "currentColor", strokeWidth: "1.5" }),
      /* @__PURE__ */ jsx3(
        "path",
        {
          d: "M7 7l6 6M13 7l-6 6",
          stroke: "currentColor",
          strokeWidth: "1.75",
          strokeLinecap: "round"
        }
      )
    ] }),
    info: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 20 20", fill: "none", className: "toast-icon", children: [
      /* @__PURE__ */ jsx3("circle", { cx: "10", cy: "10", r: "9", stroke: "currentColor", strokeWidth: "1.5" }),
      /* @__PURE__ */ jsx3(
        "path",
        {
          d: "M10 9v5M10 6.5v.5",
          stroke: "currentColor",
          strokeWidth: "1.75",
          strokeLinecap: "round"
        }
      )
    ] })
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `toast toast--${toast.type} ${toast.exiting ? "toast--exit" : ""}`,
      role: "alert",
      children: [
        icons[toast.type],
        /* @__PURE__ */ jsx3("span", { className: "toast-message", children: toast.message }),
        /* @__PURE__ */ jsx3(
          "button",
          {
            className: "toast-close",
            onClick: () => onDismiss(toast.id),
            "aria-label": "Dismiss",
            children: /* @__PURE__ */ jsx3("svg", { viewBox: "0 0 12 12", fill: "none", children: /* @__PURE__ */ jsx3(
              "path",
              {
                d: "M1 1l10 10M11 1L1 11",
                stroke: "currentColor",
                strokeWidth: "1.5",
                strokeLinecap: "round"
              }
            ) })
          }
        )
      ]
    }
  );
}
function useToast() {
  const ctx = useContext3(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// src/components/templates/AdminShell.jsx
import { useState as useState4 } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

// src/components/organisms/AdminNav.jsx
import { usePathname as usePathname2 } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
function AdminNav({ items, panel }) {
  const pathname = usePathname2();
  const visibleitems = {
    dashboard: {
      label: "Dashboard",
      icon: LayoutDashboard
    },
    ...items
  };
  return /* @__PURE__ */ jsx4("ul", { className: "flex flex-col gap-1", children: Object.entries(visibleitems ?? {}).map(([key, value]) => {
    const isactive = pathname.startsWith("/admin/" + key);
    return /* @__PURE__ */ jsx4("li", { title: key, className: "w-full", children: /* @__PURE__ */ jsx4(Link, { href: `/admin/${key}`, className: "block w-full", children: /* @__PURE__ */ jsxs2(
      "div",
      {
        className: `flex items-center gap-3 rounded-lg border p-2 text-sm font-medium transition-colors ${isactive ? "border-gray-200 bg-white text-gray-900 shadow-sm" : "border-transparent text-gray-500 hover:bg-white hover:text-gray-900"} ${panel ? "" : "justify-center"}`,
        children: [
          /* @__PURE__ */ jsx4(value.icon, { size: 18, className: isactive ? "text-gray-900" : "text-gray-400" }),
          panel && /* @__PURE__ */ jsx4("span", { children: value.label })
        ]
      }
    ) }) }, key);
  }) });
}

// src/components/organisms/AdminNavLogo.jsx
import { jsx as jsx5 } from "react/jsx-runtime";
function Logo({ panel }) {
  return /* @__PURE__ */ jsx5("div", { className: "flex h-10 items-center", children: panel ? /* @__PURE__ */ jsx5("img", { src: "/logo.png", alt: "Logo", className: "h-7 w-auto object-contain" }) : /* @__PURE__ */ jsx5(
    "img",
    {
      src: "/favicon.ico",
      alt: "Logo",
      className: "h-7 w-7 rounded-md object-contain"
    }
  ) });
}

// src/components/molecules/Breadcrumb.jsx
import { usePathname as usePathname3, useRouter as useRouter4 } from "next/navigation";
import { ArrowLeft, ChevronRight, House } from "lucide-react";
import { jsx as jsx6, jsxs as jsxs3 } from "react/jsx-runtime";
function Breadcrumb() {
  const pathname = usePathname3();
  const router = useRouter4();
  if (pathname === "/") return null;
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, i) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    path: "/" + segments.slice(0, i + 1).join("/")
  }));
  return /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsx6(
      "button",
      {
        type: "button",
        onClick: () => router.back(),
        className: "flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900",
        "aria-label": "Go back",
        children: /* @__PURE__ */ jsx6(ArrowLeft, { size: 20 })
      }
    ),
    /* @__PURE__ */ jsxs3("div", { className: "flex flex-wrap items-center gap-1", children: [
      /* @__PURE__ */ jsxs3(
        "button",
        {
          type: "button",
          onClick: () => router.push("/"),
          className: "flex items-center gap-1.5 rounded-md px-1 py-1 text-gray-500 transition-colors hover:text-gray-900",
          children: [
            /* @__PURE__ */ jsx6(House, { size: 14 }),
            /* @__PURE__ */ jsx6("span", { className: "text-sm", children: "Home" })
          ]
        }
      ),
      crumbs.map((crumb, i) => /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsx6(ChevronRight, { size: 16, className: "text-gray-400" }),
        i === crumbs.length - 1 ? /* @__PURE__ */ jsx6("span", { className: "text-sm font-semibold text-gray-900", children: crumb.label }) : /* @__PURE__ */ jsx6(
          "button",
          {
            type: "button",
            onClick: () => router.push(crumb.path),
            className: "rounded-md px-1 py-1 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900",
            children: crumb.label
          }
        )
      ] }, crumb.path))
    ] })
  ] });
}

// src/components/templates/AdminShell.jsx
import { useRouter as useRouter5 } from "next/navigation";
import { jsx as jsx7, jsxs as jsxs4 } from "react/jsx-runtime";
function AdminShell({ children }) {
  const [panel, setPanel] = useState4(true);
  const { user } = useAuth();
  const { post } = useApi();
  const router = useRouter5();
  const handleLogout = async () => {
    const res = await post("/api/users/logout");
    if (res.ok) router.push("/login");
  };
  const entities = getEntities();
  const visibleEntities = Object.fromEntries(
    Object.entries(entities).filter(([_, entity]) => {
      var _a;
      return (_a = entity.roles) == null ? void 0 : _a.includes(user == null ? void 0 : user.role);
    })
  );
  return /* @__PURE__ */ jsxs4("div", { className: "flex h-screen bg-black-500", children: [
    /* @__PURE__ */ jsxs4(
      "div",
      {
        className: `relative flex flex-col gap-1 border-r border-gray-200 bg-gray-50 p-3 transition-all duration-200 ${panel ? "w-[220px]" : "w-[72px]"}`,
        children: [
          /* @__PURE__ */ jsx7(
            "button",
            {
              type: "button",
              onClick: () => setPanel((prev) => !prev),
              title: panel ? "Collapse sidebar" : "Expand sidebar",
              className: "absolute top-8 -right-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900 focus:outline-none",
              children: panel ? /* @__PURE__ */ jsx7(PanelLeftClose, { size: 16 }) : /* @__PURE__ */ jsx7(PanelLeftOpen, { size: 16 })
            }
          ),
          /* @__PURE__ */ jsx7("div", { className: "px-1 py-2", children: /* @__PURE__ */ jsx7(Logo, { panel }) }),
          /* @__PURE__ */ jsx7("div", { className: "mt-2 h-px bg-gray-200" }),
          /* @__PURE__ */ jsx7("div", { className: "mt-2 flex-1 overflow-y-auto", children: /* @__PURE__ */ jsx7(AdminNav, { items: visibleEntities, panel }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxs4("div", { className: "flex flex-1 p-4 gap-4 flex-col overflow-y-auto", children: [
      /* @__PURE__ */ jsxs4("div", { className: "flex justify-between w-full", children: [
        /* @__PURE__ */ jsx7(Breadcrumb, {}),
        /* @__PURE__ */ jsxs4("div", { className: "flex gap-md items-center", children: [
          /* @__PURE__ */ jsx7("span", { className: "rounded-md p-1 bg-gray-500 text-white text-xs", children: user == null ? void 0 : user.role }),
          /* @__PURE__ */ jsx7("button", { className: "wrapper-btn", title: "Logout", onClick: handleLogout, children: /* @__PURE__ */ jsx7(LogOut, { size: 18 }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx7("div", { className: "flex-1 ", children })
    ] })
  ] });
}

// src/contexts/AdminProvider.jsx
import { jsx as jsx8 } from "react/jsx-runtime";
function AdminProvider({ children }) {
  const config = getRuntimeConfig();
  if (!(config == null ? void 0 : config.apiBaseUrl)) {
    throw new Error(
      "[@lynx/admin-panel] Missing config. Make sure <AdminConfigInit config={adminConfig} /> is mounted in your root layout before any admin routes render."
    );
  }
  return /* @__PURE__ */ jsx8(ApiProvider, { baseUrl: config.apiBaseUrl, children: /* @__PURE__ */ jsx8(AuthProvider, { children: /* @__PURE__ */ jsx8(ToastProvider, { children: /* @__PURE__ */ jsx8(AdminGate, { children: /* @__PURE__ */ jsx8(AdminShell, { children }) }) }) }) });
}

// src/components/templates/AdminLayout.jsx
import { jsx as jsx9, jsxs as jsxs5 } from "react/jsx-runtime";
function AdminLayout({ title, formId, buttonLabel = "Save", children }) {
  return /* @__PURE__ */ jsxs5("div", { className: "flex h-full flex-col", children: [
    /* @__PURE__ */ jsxs5("header", { className: "sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur", children: [
      /* @__PURE__ */ jsx9("h1", { className: "truncate text-xl font-semibold text-gray-900", children: title }),
      formId && /* @__PURE__ */ jsx9(
        "button",
        {
          type: "submit",
          form: formId,
          className: "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800",
          children: buttonLabel
        }
      )
    ] }),
    /* @__PURE__ */ jsx9("main", { className: "flex-1 overflow-auto p-6", children })
  ] });
}

// src/components/templates/AdminChildrenLayout.jsx
import { createContext as createContext4, useContext as useContext4, useState as useState6, useEffect as useEffect5 } from "react";
import Link4 from "next/link";
import { Plus, Search, X } from "lucide-react";

// src/components/templates/DataTable.jsx
import { useEffect as useEffect4, useRef as useRef2, useState as useState5 } from "react";
import Link3 from "next/link";
import { Trash2 as Trash22 } from "lucide-react";

// src/components/atoms/Badge.jsx
import { jsx as jsx10 } from "react/jsx-runtime";
var VARIANT_STYLES = {
  default: "bg-gray-100 text-gray-800",
  primary: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  outline: "bg-transparent text-gray-700 border border-gray-300"
};
var SIZE_STYLES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
  lg: "text-base px-3 py-1"
};
var Badge = ({
  variant = "default",
  size = "md",
  value,
  className = ""
}) => {
  return /* @__PURE__ */ jsx10(
    "span",
    {
      className: `inline-flex items-center rounded-full font-medium ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`,
      children: value
    }
  );
};

// src/components/atoms/Buttons.jsx
import Link2 from "next/link";
import { useRouter as useRouter6 } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Eye, Pencil, RotateCw, Trash2 } from "lucide-react";
import { jsx as jsx11 } from "react/jsx-runtime";
var bare = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0
};
function Button({ className, onClick, children }) {
  return /* @__PURE__ */ jsx11("button", { className: `btn ${className}`, onClick, children });
}
function BlueRedButton({ className, onClick, children }) {
  return /* @__PURE__ */ jsx11(
    "button",
    {
      className: `btn bg-primaryBlue p-2 text-white ${className}`,
      onClick,
      children
    }
  );
}
function EditButton({ onClick }) {
  return /* @__PURE__ */ jsx11("button", { style: bare, title: "Edit", onClick, children: /* @__PURE__ */ jsx11(Pencil, { size: 16 }) });
}
function DeleteButton({ onClick }) {
  return /* @__PURE__ */ jsx11("button", { style: bare, title: "Delete", onClick, children: /* @__PURE__ */ jsx11(Trash2, { size: 16, color: "red" }) });
}
function ViewButton({
  href,
  target = "_blank",
  title = "View in website"
}) {
  return /* @__PURE__ */ jsx11(Link2, { href, target, title, children: /* @__PURE__ */ jsx11(Eye, { size: 16 }) });
}
function ResetButton({ onClick }) {
  return /* @__PURE__ */ jsx11(
    "button",
    {
      style: bare,
      className: "scale-x-[-1]",
      title: "Reset",
      onClick,
      children: /* @__PURE__ */ jsx11(RotateCw, { size: 16 })
    }
  );
}
function BackButton() {
  const router = useRouter6();
  return /* @__PURE__ */ jsx11("button", { className: "btn", onClick: () => router.back(), children: /* @__PURE__ */ jsx11(ChevronLeft, { size: 20 }) });
}

// src/components/organisms/DeleteAction.jsx
import { jsx as jsx12 } from "react/jsx-runtime";
function DeleteAction({ route, mutate }) {
  const { del } = useApi();
  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) return;
    const res = await del(`${route}`, { success: "Successfully deleted" });
    if ((res == null ? void 0 : res.statusCode) == 200) mutate == null ? void 0 : mutate();
  };
  return /* @__PURE__ */ jsx12(DeleteButton, { onClick: handleDelete });
}

// src/utils/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function resolveUrl(media) {
  var _a;
  const host = getHost();
  return ((_a = media.url) == null ? void 0 : _a.startsWith("http")) ? media.url : `${host}${media.url}`;
}
function capitalise(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(val) {
  return typeof val === "string" && UUID_REGEX.test(val);
}
function removeEmptyFields(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === void 0) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") continue;
      result[key] = trimmed;
    } else {
      result[key] = value;
    }
  }
  return result;
}

// src/components/templates/DataTable.jsx
import { Fragment, jsx as jsx13, jsxs as jsxs6 } from "react/jsx-runtime";
function normalizePayloadResponse(data) {
  if (Array.isArray(data)) {
    return { docs: data, totalDocs: data.length, page: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  }
  return {
    items: (data == null ? void 0 : data.items) ?? [],
    total: (data == null ? void 0 : data.total) ?? 0,
    page: (data == null ? void 0 : data.page) ?? 1,
    totalPages: (data == null ? void 0 : data.totalPages) ?? 1,
    hasNextPage: (data == null ? void 0 : data.page) < (data == null ? void 0 : data.totalPages) || false,
    hasPrevPage: (data == null ? void 0 : data.page) > 1 || false
  };
}
function resolveRelationValue(value, labelKey = "name") {
  if (value == null) return null;
  if (typeof value === "string") return { id: value, label: value };
  return { id: value.id, label: value[labelKey] ?? value.filename ?? value.id };
}
function DataTable({
  data,
  fields,
  editHref,
  actions,
  onPageChange,
  // optional: (nextPage: number) => void
  selectable = true
  // set false to hide the checkbox column entirely
}) {
  const { name, mutate } = useEntity();
  const { items, total, page, totalPages, hasNextPage, hasPrevPage } = normalizePayloadResponse(data);
  const [selectedIds, setSelectedIds] = useState5(() => /* @__PURE__ */ new Set());
  const [isDeleting, setIsDeleting] = useState5(false);
  const headerCheckboxRef = useRef2(null);
  useEffect4(() => {
    setSelectedIds(/* @__PURE__ */ new Set());
  }, [data]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected = items.length > 0 && selectedCount === items.length;
  const someOnPageSelected = selectedCount > 0 && !allOnPageSelected;
  useEffect4(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someOnPageSelected;
    }
  }, [someOnPageSelected]);
  const toggleAll = () => {
    setSelectedIds(allOnPageSelected ? /* @__PURE__ */ new Set() : new Set(items.map((item) => item.id)));
  };
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedCount} selected ${selectedCount === 1 ? "record" : "records"}? This can't be undone.`
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map(
          (id) => fetch(`/api/${name}/${id}`, { method: "DELETE" })
        )
      );
      const failed = results.filter((r) => {
        var _a;
        return r.status === "rejected" || ((_a = r.value) == null ? void 0 : _a.ok) === false;
      });
      if (failed.length > 0) {
        console.error(`${failed.length} of ${selectedCount} deletes failed`);
      }
      await mutate();
      setSelectedIds(/* @__PURE__ */ new Set());
    } finally {
      setIsDeleting(false);
    }
  };
  const renderCell = (item, field) => {
    const [key, type, ...rest] = field.key.split(":");
    const value = item[key];
    switch (type) {
      case "image":
        return /* @__PURE__ */ jsx13("div", { className: "h-9 w-9 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200", children: /* @__PURE__ */ jsx13(
          "img",
          {
            src: resolveUrl(value),
            alt: field.head,
            className: "h-full w-full object-cover"
          }
        ) });
      case "upload": {
        const media = typeof value === "object" && value !== null ? value : null;
        const src = (media == null ? void 0 : media.url) ? resolveUrl(media.url) : null;
        if (!src) {
          return /* @__PURE__ */ jsx13("div", { className: "flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 ring-1 ring-gray-200", children: "\u2014" });
        }
        return /* @__PURE__ */ jsx13("div", { className: "h-9 w-9 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200", children: /* @__PURE__ */ jsx13("img", { src, alt: (media == null ? void 0 : media.alt) ?? field.head, className: "h-full w-full object-cover" }) });
      }
      case "relationship": {
        const labelKey = rest[0] ?? "name";
        const resolved = resolveRelationValue(value, labelKey);
        return resolved ? /* @__PURE__ */ jsx13("span", { className: "text-sm text-gray-700", children: resolved.label }) : /* @__PURE__ */ jsx13("span", { className: "text-sm text-gray-400", children: "\u2014" });
      }
      case "date":
        if (!value) return /* @__PURE__ */ jsx13("span", { className: "text-sm text-gray-400", children: "\u2014" });
        return /* @__PURE__ */ jsx13("span", { className: "text-sm text-gray-600", children: new Date(value).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }) });
      case "bold":
        return /* @__PURE__ */ jsx13("span", { className: "text-sm font-semibold text-gray-900", children: value });
      case "status":
        return /* @__PURE__ */ jsx13(
          Badge,
          {
            value,
            variant: value === "published" ? "success" : "default"
          }
        );
      default:
        return /* @__PURE__ */ jsx13("span", { className: "text-sm text-gray-600", title: value, children: value });
    }
  };
  const defaultActions = (item) => /* @__PURE__ */ jsxs6(Fragment, { children: [
    editHref && /* @__PURE__ */ jsx13(
      Link3,
      {
        href: typeof editHref === "function" ? editHref(item) : editHref + item.id,
        className: "rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700",
        children: /* @__PURE__ */ jsx13(EditButton, {})
      }
    ),
    /* @__PURE__ */ jsx13(DeleteAction, { route: `/api/${name}/${item.id}`, mutate })
  ] });
  const renderActions = actions ?? defaultActions;
  return /* @__PURE__ */ jsxs6("div", { className: "flex flex-col gap-3", children: [
    selectable && selectedCount > 0 && /* @__PURE__ */ jsxs6("div", { className: "flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5", children: [
      /* @__PURE__ */ jsxs6("span", { className: "text-sm text-gray-600", children: [
        /* @__PURE__ */ jsx13("span", { className: "font-medium text-gray-900", children: selectedCount }),
        " ",
        selectedCount === 1 ? "record" : "records",
        " selected"
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx13(
          "button",
          {
            type: "button",
            onClick: () => setSelectedIds(/* @__PURE__ */ new Set()),
            className: "text-sm font-medium text-gray-500 hover:text-gray-700",
            children: "Clear"
          }
        ),
        /* @__PURE__ */ jsxs6(
          "button",
          {
            type: "button",
            onClick: handleBulkDelete,
            disabled: isDeleting,
            className: "flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60",
            children: [
              /* @__PURE__ */ jsx13(Trash22, { size: 14 }),
              isDeleting ? "Deleting\u2026" : "Delete"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx13("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", children: /* @__PURE__ */ jsx13("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs6("table", { className: "w-full border-collapse text-left", children: [
      /* @__PURE__ */ jsx13("thead", { children: /* @__PURE__ */ jsxs6("tr", { className: "border-b border-gray-200 bg-gray-50", children: [
        selectable && /* @__PURE__ */ jsx13("th", { className: "w-10 ", children: /* @__PURE__ */ jsx13(
          "input",
          {
            ref: headerCheckboxRef,
            type: "checkbox",
            checked: allOnPageSelected,
            onChange: toggleAll,
            disabled: items.length === 0,
            className: "h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900",
            "aria-label": "Select all rows on this page"
          }
        ) }),
        fields.map((field, i) => /* @__PURE__ */ jsx13(
          "th",
          {
            className: "whitespace-nowrap  text-xs font-medium uppercase tracking-wide text-gray-500",
            children: field.head
          },
          i
        )),
        renderActions && /* @__PURE__ */ jsx13("th", { className: "whitespace-nowrap  text-right text-xs font-medium uppercase tracking-wide text-gray-500", children: "Action" })
      ] }) }),
      /* @__PURE__ */ jsxs6("tbody", { className: "divide-y divide-gray-100", children: [
        items.map((item, index) => {
          const isSelected = selectedIds.has(item.id);
          return /* @__PURE__ */ jsxs6(
            "tr",
            {
              className: `transition-colors hover:bg-gray-50 ${isSelected ? "bg-gray-50" : ""}`,
              children: [
                selectable && /* @__PURE__ */ jsx13("td", { className: " align-middle", children: /* @__PURE__ */ jsx13(
                  "input",
                  {
                    type: "checkbox",
                    checked: isSelected,
                    onChange: () => toggleOne(item.id),
                    className: "h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900",
                    "aria-label": "Select row"
                  }
                ) }),
                fields.map((field, i) => /* @__PURE__ */ jsx13("td", { className: "whitespace-nowrap px-4 py-3 align-middle", children: renderCell(item, field) }, i)),
                renderActions && /* @__PURE__ */ jsx13("td", { className: " align-middle", children: /* @__PURE__ */ jsx13("div", { className: "flex items-center justify-end gap-1", children: renderActions(item) }) })
              ]
            },
            item.id ?? index
          );
        }),
        items.length === 0 && /* @__PURE__ */ jsx13("tr", { children: /* @__PURE__ */ jsx13(
          "td",
          {
            colSpan: (selectable ? 1 : 0) + fields.length + (renderActions ? 1 : 0),
            className: "px-4 py-12 text-center text-sm text-gray-400",
            children: "No records found."
          }
        ) })
      ] })
    ] }) }) }),
    onPageChange && totalPages > 1 && /* @__PURE__ */ jsxs6("div", { className: "flex items-center justify-between text-sm", children: [
      /* @__PURE__ */ jsxs6("span", { className: "text-gray-500", children: [
        "Page ",
        /* @__PURE__ */ jsx13("span", { className: "font-medium text-gray-700", children: page }),
        " of",
        " ",
        /* @__PURE__ */ jsx13("span", { className: "font-medium text-gray-700", children: totalPages }),
        " ",
        /* @__PURE__ */ jsxs6("span", { className: "text-gray-400", children: [
          "(",
          total,
          " total)"
        ] })
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx13(
          "button",
          {
            type: "button",
            disabled: !hasPrevPage,
            onClick: () => onPageChange(page - 1),
            className: "rounded-md border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white",
            children: "Previous"
          }
        ),
        /* @__PURE__ */ jsx13(
          "button",
          {
            type: "button",
            disabled: !hasNextPage,
            onClick: () => onPageChange(page + 1),
            className: "rounded-md border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white",
            children: "Next"
          }
        )
      ] })
    ] })
  ] });
}

// src/hooks/useFetchEntity.js
function useFetchEntity(name, params) {
  const { data, mutate } = useGet(`/${name}?${params == null ? void 0 : params.toString()}`);
  return {
    data,
    mutate
  };
}

// src/components/templates/AdminChildrenLayout.jsx
import { jsx as jsx14, jsxs as jsxs7 } from "react/jsx-runtime";
var EntityContext = createContext4({});
var useEntity = () => useContext4(EntityContext);
function AdminChildrenLayout({
  name,
  tablefields,
  actions
}) {
  var _a;
  const entities = getEntities();
  const entityConfig = entities[name];
  const filterConfig = (entityConfig == null ? void 0 : entityConfig.filters) || [];
  const [page, setPage] = useState6(1);
  const [limit, setLimit] = useState6(10);
  const [search, setSearch] = useState6("");
  const [debouncedSearch, setDebouncedSearch] = useState6("");
  const [activeFilters, setActiveFilters] = useState6({});
  useEffect5(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", limit);
  if (debouncedSearch) {
    params.set("where[name][like]", debouncedSearch);
  }
  Object.entries(activeFilters).forEach(([field, value2]) => {
    if (value2) {
      params.set(`where[${field}][equals]`, value2);
    }
  });
  const entity = useFetchEntity(name, params);
  const value = {
    name,
    ...entity
  };
  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };
  const handleFilterChange = (field, value2) => {
    setActiveFilters((prev) => ({
      ...prev,
      [field]: value2
    }));
    setPage(1);
  };
  const clearAllFilters = () => {
    setActiveFilters({});
    setPage(1);
  };
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  return /* @__PURE__ */ jsx14(EntityContext, { value, children: /* @__PURE__ */ jsxs7("div", { className: "flex flex-col gap-5", children: [
    /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm", children: [
      /* @__PURE__ */ jsxs7("div", { children: [
        /* @__PURE__ */ jsx14("h2", { className: "text-lg font-semibold text-gray-900", children: capitalise(name) }),
        typeof ((_a = entity == null ? void 0 : entity.data) == null ? void 0 : _a.totalDocs) === "number" && /* @__PURE__ */ jsxs7("p", { className: "text-sm text-gray-500", children: [
          entity.data.totalDocs,
          " total"
        ] })
      ] }),
      /* @__PURE__ */ jsxs7(
        Link4,
        {
          href: `/admin/${name}/new`,
          className: "flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800",
          children: [
            /* @__PURE__ */ jsx14(Plus, { size: 16 }),
            "New ",
            capitalise(name)
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs7("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs7("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxs7("div", { className: "relative", children: [
          /* @__PURE__ */ jsx14("div", { className: "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400", children: /* @__PURE__ */ jsx14(Search, { size: 16 }) }),
          /* @__PURE__ */ jsx14(
            "input",
            {
              type: "text",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: `Search ${name}...`,
              className: "w-full sm:w-64 rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            }
          )
        ] }),
        filterConfig.map((filter) => /* @__PURE__ */ jsxs7(
          "select",
          {
            value: activeFilters[filter.field] || "",
            onChange: (e) => handleFilterChange(filter.field, e.target.value),
            className: "rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900",
            children: [
              /* @__PURE__ */ jsxs7("option", { value: "", children: [
                "All ",
                filter.label
              ] }),
              filter.options.map((opt) => {
                const val = typeof opt === "string" ? opt : opt.value;
                const label = typeof opt === "string" ? opt : opt.label;
                return /* @__PURE__ */ jsx14("option", { value: val, children: label }, val);
              })
            ]
          },
          filter.field
        )),
        activeFilterCount > 0 && /* @__PURE__ */ jsxs7(
          "button",
          {
            onClick: clearAllFilters,
            className: "flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900",
            children: [
              /* @__PURE__ */ jsx14(X, { size: 14 }),
              "Clear filters"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-2 ml-auto", children: [
        /* @__PURE__ */ jsx14("label", { htmlFor: "limit-select", className: "text-sm text-gray-600 whitespace-nowrap", children: "Items per page:" }),
        /* @__PURE__ */ jsxs7(
          "select",
          {
            id: "limit-select",
            value: limit,
            onChange: handleLimitChange,
            className: "rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900",
            children: [
              /* @__PURE__ */ jsx14("option", { value: 10, children: "10" }),
              /* @__PURE__ */ jsx14("option", { value: 20, children: "20" }),
              /* @__PURE__ */ jsx14("option", { value: 50, children: "50" }),
              /* @__PURE__ */ jsx14("option", { value: 100, children: "100" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx14(
      DataTable,
      {
        data: entity.data,
        fields: tablefields,
        editHref: `/admin/${name}/`,
        actions,
        onPageChange: (nextPage) => setPage(nextPage)
      }
    )
  ] }) });
}

// src/contexts/AdminConfigInit.jsx
import { useEffect as useEffect6 } from "react";
function AdminConfigInit({ config }) {
  useEffect6(() => {
    setRuntimeConfig(config);
  }, [config]);
  return null;
}

// src/lib/entitySchema.js
function defineEntity(def) {
  if (process.env.NODE_ENV !== "production") {
    if (!def.label) {
      console.warn("[@lynx/admin-panel] entity is missing a required `label`");
    }
    if (!Array.isArray(def.fields) || def.fields.length === 0) {
      console.warn(`[@lynx/admin-panel] entity "${def.label ?? "?"}" has no \`fields\` \u2014 table will render empty columns`);
    }
    if (def.filters && !Array.isArray(def.filters)) {
      console.warn(`[@lynx/admin-panel] entity "${def.label ?? "?"}" \`filters\` must be an array`);
    }
  }
  return def;
}
function defineEntities(map) {
  return map;
}

// src/lib/access.js
var allowed = (roles) => ({ req: { user } }) => {
  return Boolean(user && roles.includes(user.role));
};

// src/components/templates/ImageUploader.jsx
import { useEffect as useEffect8, useState as useState8 } from "react";

// src/components/organisms/MediaLibraryModal.jsx
import { useEffect as useEffect7, useRef as useRef4, useState as useState7 } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Upload, X as X2 } from "lucide-react";

// src/components/atoms/Input.jsx
import { useContext as useContext6, useRef as useRef3 } from "react";

// src/components/molecules/Form.jsx
import { createContext as createContext5, useContext as useContext5 } from "react";
import { jsx as jsx15 } from "react/jsx-runtime";
var DefaultsContext = createContext5(null);
function Form({ children, onSubmit, className, defaults = {}, ...rest }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target, e.nativeEvent.submitter);
    const values = Object.fromEntries(formData.entries());
    onSubmit(values);
  };
  return /* @__PURE__ */ jsx15(DefaultsContext.Provider, { value: defaults, children: /* @__PURE__ */ jsx15("form", { onSubmit: handleSubmit, className: `${className} admin-form`, ...rest, children }) });
}

// src/components/atoms/Input.jsx
import { jsx as jsx16, jsxs as jsxs8 } from "react/jsx-runtime";
function humanize(name = "") {
  return name.replace(/_/g, " ").replace(/-/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim().replace(/\s+/g, " ").split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function useResolvedDefault(name, rest) {
  const contextDefaults = useContext6(DefaultsContext);
  const isControlled = "value" in rest;
  const resolvedDefaultValue = "defaultValue" in rest ? rest.defaultValue : contextDefaults == null ? void 0 : contextDefaults[name];
  return isControlled ? {} : { defaultValue: resolvedDefaultValue };
}
function Input({
  placeholder,
  hidden,
  required,
  className,
  inputClassName,
  name,
  style,
  ...rest
}) {
  const defaultProps2 = useResolvedDefault(name, rest);
  const resolvedPlaceholder = placeholder ?? humanize(name);
  const inputRef = useRef3(null);
  return /* @__PURE__ */ jsxs8(
    "div",
    {
      className: `flex w-full flex-col gap-1.5 border-black ${className || ""}`,
      style: { display: hidden ? "none" : "flex", ...style },
      children: [
        resolvedPlaceholder && /* @__PURE__ */ jsxs8("label", { htmlFor: name, className: "text-sm font-medium text-gray-700", children: [
          resolvedPlaceholder,
          required && /* @__PURE__ */ jsx16("span", { className: "ml-1 text-red-500", children: "*" })
        ] }),
        /* @__PURE__ */ jsx16(
          "input",
          {
            ref: inputRef,
            id: name,
            name,
            required,
            className: `w-full rounded-lg border border-black bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${inputClassName || ""}`,
            ...defaultProps2,
            ...rest
          }
        )
      ]
    }
  );
}
function Select({ placeholder, children, className, name, required, ...rest }) {
  const defaultProps2 = useResolvedDefault(name, rest);
  const resolvedPlaceholder = placeholder ?? humanize(name);
  const safeProps = rest.value === null ? { ...rest, value: "" } : rest;
  const selectRef = useRef3(null);
  return /* @__PURE__ */ jsxs8("div", { className: `flex w-full flex-col gap-1.5 ${className || ""}`, children: [
    resolvedPlaceholder && /* @__PURE__ */ jsxs8("label", { htmlFor: name, className: "text-sm font-medium text-gray-700", children: [
      resolvedPlaceholder,
      required && /* @__PURE__ */ jsx16("span", { className: "ml-1 text-red-500", children: "*" })
    ] }),
    /* @__PURE__ */ jsx16(
      "select",
      {
        ref: selectRef,
        id: name,
        name,
        className: "w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none",
        ...defaultProps2,
        ...safeProps,
        children
      }
    )
  ] });
}
function Textarea({ placeholder, className, name, required, ...rest }) {
  const defaultProps2 = useResolvedDefault(name, rest);
  const resolvedPlaceholder = placeholder ?? humanize(name);
  const textareaRef = useRef3(null);
  return /* @__PURE__ */ jsxs8("div", { className: `flex w-full flex-col gap-1.5 ${className || ""}`, children: [
    resolvedPlaceholder && /* @__PURE__ */ jsxs8("label", { htmlFor: name, className: "text-sm font-medium text-gray-700", children: [
      resolvedPlaceholder,
      required && /* @__PURE__ */ jsx16("span", { className: "ml-1 text-red-500", children: "*" })
    ] }),
    /* @__PURE__ */ jsx16(
      "textarea",
      {
        ref: textareaRef,
        id: name,
        name,
        className: "min-h-[100px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none",
        ...defaultProps2,
        ...rest
      }
    )
  ] });
}
function NumberSelector({ name, range, numbers, ...rest }) {
  const values = numbers ?? buildRange(range);
  return /* @__PURE__ */ jsx16(Select, { name, ...rest, children: values.map((n) => /* @__PURE__ */ jsx16("option", { value: n, children: n }, n)) });
}
function buildRange([start = 0, end = 9, step = 1] = []) {
  const result = [];
  for (let n = start; n <= end; n += step) {
    result.push(n);
  }
  return result;
}
function RateInput({
  required = false,
  placeholder,
  tag,
  name,
  value,
  onChange,
  type,
  style,
  inputClassname
}) {
  return /* @__PURE__ */ jsxs8("div", { className: "custom-input flex-1 flex-col", children: [
    /* @__PURE__ */ jsx16(
      "span",
      {
        className: "font-semibold",
        style: {
          color: required ? "var(--secondary-1000)" : "black",
          marginBottom: "5px"
        },
        children: tag + (required ? "*" : "")
      }
    ),
    /* @__PURE__ */ jsx16(
      "input",
      {
        type,
        className: `rate-input ${inputClassname}`,
        style,
        placeholder,
        name,
        min: 1,
        required,
        value,
        onChange
      }
    )
  ] });
}
function RateDisplay({ required = false, value, tag, style }) {
  return /* @__PURE__ */ jsxs8("div", { className: "flex-1 flex-col", children: [
    /* @__PURE__ */ jsx16(
      "span",
      {
        className: "font-source-serif",
        style: {
          color: required ? "var(--secondary-1000)" : "black",
          fontWeight: 300
        },
        children: tag + (required ? "*" : "")
      }
    ),
    /* @__PURE__ */ jsx16(
      "div",
      {
        className: "rate-input",
        style: {
          display: "flex",
          alignItems: "center",
          color: value ? "black" : "#bbb",
          ...style
        },
        children: value
      }
    )
  ] });
}

// src/components/organisms/MediaLibraryModal.jsx
import { Fragment as Fragment2, jsx as jsx17, jsxs as jsxs9 } from "react/jsx-runtime";
function formatCategoryLabel(key) {
  return key.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function MediaLibraryModal({ onClose, onSelect, name }) {
  const [activeTab, setActiveTab] = useState7("browse");
  const { data, isLoading, mutate } = useGet(getMediaRoute());
  const { post, del } = useApi();
  const [uploading, setUploading] = useState7(false);
  const [deletingId, setDeletingId] = useState7(null);
  const [previewUrl, setPreviewUrl] = useState7(null);
  const fileInputRef = useRef4(null);
  const uploadFieldsRef = useRef4(null);
  const items = Object.fromEntries(
    Object.entries(data ?? {}).filter(([, val]) => Array.isArray(val))
  );
  useEffect7(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  const handleFileChange = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };
  const resetUploadTab = () => {
    var _a, _b;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const altEl = (_a = uploadFieldsRef.current) == null ? void 0 : _a.querySelector('input[name="alt"]');
    const titleEl = (_b = uploadFieldsRef.current) == null ? void 0 : _b.querySelector('input[name="title"]');
    if (altEl) altEl.value = "";
    if (titleEl) titleEl.value = "";
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };
  const handleUpload = async () => {
    var _a, _b, _c, _d, _e, _f;
    const file = (_b = (_a = fileInputRef.current) == null ? void 0 : _a.files) == null ? void 0 : _b[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("media", file);
    const alt = (_d = (_c = uploadFieldsRef.current) == null ? void 0 : _c.querySelector('input[name="alt_text"]')) == null ? void 0 : _d.value;
    const title = (_f = (_e = uploadFieldsRef.current) == null ? void 0 : _e.querySelector('input[name="title"]')) == null ? void 0 : _f.value;
    if (alt) formData.append("alt_text", alt);
    if (title) formData.append("title", title);
    formData.append("type", "image");
    const created = await post("/media", formData);
    setUploading(false);
    if (created) {
      resetUploadTab();
      mutate();
      setActiveTab("browse");
    }
  };
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this image from the media library?")) return;
    setDeletingId(id);
    await del(`/media/${id}`);
    setDeletingId(null);
    mutate();
  };
  return /* @__PURE__ */ jsx17(
    "div",
    {
      className: "fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4",
      onClick: onClose,
      children: /* @__PURE__ */ jsxs9(
        "div",
        {
          className: "flex w-full max-w-[720px] max-h-[85vh] flex-col gap-4 overflow-hidden rounded-xl bg-white p-5 shadow-2xl",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxs9("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx17("h3", { className: "m-0 text-lg font-semibold text-gray-900", children: "Media Library" }),
              /* @__PURE__ */ jsx17(
                "button",
                {
                  type: "button",
                  className: "flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900",
                  onClick: onClose,
                  title: "Close",
                  children: /* @__PURE__ */ jsx17(X2, { size: 18 })
                }
              )
            ] }),
            /* @__PURE__ */ jsxs9("div", { className: "flex gap-1 border-b border-gray-300", role: "tablist", children: [
              /* @__PURE__ */ jsxs9(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": activeTab === "browse",
                  className: `inline-flex translate-y-px items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${activeTab === "browse" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"}`,
                  onClick: () => setActiveTab("browse"),
                  children: [
                    /* @__PURE__ */ jsx17(ImageIcon, { size: 15 }),
                    /* @__PURE__ */ jsx17("span", { children: "Browse" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs9(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": activeTab === "upload",
                  className: `inline-flex translate-y-px items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${activeTab === "upload" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"}`,
                  onClick: () => setActiveTab("upload"),
                  children: [
                    /* @__PURE__ */ jsx17(Upload, { size: 15 }),
                    /* @__PURE__ */ jsx17("span", { children: "Upload" })
                  ]
                }
              )
            ] }),
            activeTab === "browse" ? isLoading ? /* @__PURE__ */ jsxs9("div", { className: "flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500", children: [
              /* @__PURE__ */ jsx17(Loader2, { size: 20, className: "animate-spin" }),
              /* @__PURE__ */ jsx17("span", { children: "Loading media\u2026" })
            ] }) : Object.keys(items).length === 0 ? /* @__PURE__ */ jsx17("p", { className: "flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500", children: "No images uploaded yet." }) : /* @__PURE__ */ jsx17("div", { className: "flex flex-col gap-2.5 overflow-y-scroll", children: Object.entries(items).map(([key, val]) => /* @__PURE__ */ jsxs9("div", { children: [
              /* @__PURE__ */ jsx17("h4", { className: "mb-2 text-sm font-semibold text-gray-700", children: formatCategoryLabel(key) }),
              !val || val.length === 0 ? /* @__PURE__ */ jsx17("p", { className: "flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500", children: "No images in this category yet." }) : /* @__PURE__ */ jsx17("div", { className: "grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 overflow-y-auto p-0.5", children: val.filter((item) => item.url).map((item, n) => /* @__PURE__ */ jsxs9(
                "div",
                {
                  className: "group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-gray-300 transition-all hover:-translate-y-px hover:border-blue-600",
                  onClick: () => onSelect(item),
                  title: item.filename,
                  children: [
                    /* @__PURE__ */ jsx17(
                      Image,
                      {
                        src: resolveUrl(item.url),
                        alt: item.alt || item.filename || "media item",
                        className: "h-full w-full object-cover bg-gray-100",
                        fill: true
                      }
                    ),
                    /* @__PURE__ */ jsx17(
                      "button",
                      {
                        type: "button",
                        className: "absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-100",
                        onClick: (e) => handleDelete(e, item.id),
                        title: "Delete image",
                        disabled: deletingId === item.id,
                        children: deletingId === item.id ? /* @__PURE__ */ jsx17(Loader2, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsx17(X2, { size: 14 })
                      }
                    )
                  ]
                },
                `${key}-${n}`
              )) })
            ] }, key)) }) : /* @__PURE__ */ jsxs9("div", { className: `flex flex-col gap-2 ${uploading ? "opacity-70" : ""}`, children: [
              /* @__PURE__ */ jsxs9(
                "label",
                {
                  className: `relative flex h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 ${uploading ? "cursor-default opacity-70" : ""} ${previewUrl ? "border-solid p-0" : ""}`,
                  children: [
                    uploading ? /* @__PURE__ */ jsxs9(Fragment2, { children: [
                      /* @__PURE__ */ jsx17(Loader2, { size: 28, className: "animate-spin" }),
                      /* @__PURE__ */ jsx17("span", { children: "Uploading\u2026" })
                    ] }) : previewUrl ? /* @__PURE__ */ jsxs9(Fragment2, { children: [
                      /* @__PURE__ */ jsx17(
                        "img",
                        {
                          src: previewUrl,
                          alt: "Selected file preview",
                          className: "absolute inset-0 h-full w-full object-contain"
                        }
                      ),
                      /* @__PURE__ */ jsx17(
                        "button",
                        {
                          type: "button",
                          className: "absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80",
                          onClick: (e) => {
                            e.preventDefault();
                            resetUploadTab();
                          },
                          title: "Remove selected image",
                          children: /* @__PURE__ */ jsx17(X2, { size: 14 })
                        }
                      )
                    ] }) : /* @__PURE__ */ jsxs9(Fragment2, { children: [
                      /* @__PURE__ */ jsx17(Upload, { size: 28 }),
                      /* @__PURE__ */ jsx17("span", { children: "Click to choose an image" }),
                      /* @__PURE__ */ jsx17("span", { className: "text-xs text-gray-500", children: "PNG, JPG, WEBP up to 10MB" })
                    ] }),
                    /* @__PURE__ */ jsx17(
                      "input",
                      {
                        ref: fileInputRef,
                        type: "file",
                        accept: "image/png, image/jpeg, image/webp",
                        onChange: handleFileChange,
                        hidden: true,
                        disabled: uploading
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxs9("div", { ref: uploadFieldsRef, className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsx17(Input, { name: "alt_text", placeholder: "Alt text", disabled: uploading }),
                /* @__PURE__ */ jsx17(Input, { name: "title", placeholder: "Title", disabled: uploading })
              ] }),
              /* @__PURE__ */ jsx17(
                "button",
                {
                  type: "button",
                  className: "btn btn-primary",
                  onClick: handleUpload,
                  disabled: uploading || !previewUrl,
                  children: uploading ? "Uploading\u2026" : "Upload"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}

// src/components/templates/ImageUploader.jsx
import { jsx as jsx18, jsxs as jsxs10 } from "react/jsx-runtime";
function ImageUploader({
  name,
  altname,
  titlename,
  setCoverImage = () => {
  },
  removeCoverImage = null,
  id = "cover-image-input",
  caption = "Cover Image",
  defaultCover = null
}) {
  var _a, _b;
  const [coverPreview, setCoverPreview] = useState8(defaultCover);
  const [selectedMediaId, setSelectedMediaId] = useState8(null);
  const [modalOpen, setModalOpen] = useState8(false);
  const [alt, setAlt] = useState8("");
  const [title, setTitle] = useState8("");
  useEffect8(() => {
    setCoverPreview(defaultCover);
  }, [defaultCover]);
  const handleSelectMedia = (media) => {
    setCoverPreview(media.url);
    setSelectedMediaId(media.id);
    setAlt(media.alt_text);
    setTitle(media.title);
    setCoverImage(media);
    setModalOpen(false);
  };
  const handleRemoveImage = () => {
    if (removeCoverImage) {
      removeCoverImage();
      return;
    }
    setCoverImage(null);
    setCoverPreview(null);
    setSelectedMediaId(null);
  };
  return /* @__PURE__ */ jsxs10("div", { className: "flex flex-col gap-2", children: [
    /* @__PURE__ */ jsx18("label", { className: "text-sm font-semibold text-gray-700", children: caption }),
    coverPreview ? /* @__PURE__ */ jsxs10("div", { className: "relative w-full h-40 rounded-lg overflow-hidden border border-gray-200", children: [
      /* @__PURE__ */ jsx18(
        "img",
        {
          src: resolveUrl(coverPreview),
          alt: "Cover preview",
          className: "block w-full h-full max-h-[280px] max-w-[300px] object-contain",
          onClick: () => setModalOpen(true)
        }
      ),
      /* @__PURE__ */ jsx18(
        "button",
        {
          type: "button",
          onClick: handleRemoveImage,
          className: "absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/55 text-white text-xs cursor-pointer transition-colors hover:bg-red-600/85",
          title: "Remove image",
          children: "\u2715"
        }
      )
    ] }) : /* @__PURE__ */ jsxs10(
      "button",
      {
        type: "button",
        className: "flex flex-col items-center justify-center gap-2 h-40 p-5 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-pointer transition-colors hover:border-indigo-500 hover:text-indigo-500",
        onClick: () => setModalOpen(true),
        children: [
          /* @__PURE__ */ jsxs10(
            "svg",
            {
              xmlns: "http://www.w3.org/2000/svg",
              width: "32",
              height: "32",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "1.5",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              children: [
                /* @__PURE__ */ jsx18("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
                /* @__PURE__ */ jsx18("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
                /* @__PURE__ */ jsx18("path", { d: "M21 15l-5-5L5 21" })
              ]
            }
          ),
          /* @__PURE__ */ jsx18("span", { className: "text-sm font-medium", children: "Click to choose from media library" }),
          /* @__PURE__ */ jsx18("span", { className: "text-xs text-gray-300", children: "PNG, JPG, WEBP up to 10MB" })
        ]
      }
    ),
    /* @__PURE__ */ jsx18("input", { type: "hidden", name, id, value: coverPreview ?? "", readOnly: true }),
    /* @__PURE__ */ jsx18("input", { type: "hidden", name: altname || `${(_a = name == null ? void 0 : name.split("_")) == null ? void 0 : _a[0]}_alt`, value: alt, readOnly: true }),
    /* @__PURE__ */ jsx18(
      "input",
      {
        type: "hidden",
        name: titlename || `${(_b = name == null ? void 0 : name.split("_")) == null ? void 0 : _b[0]}_title`,
        value: title,
        readOnly: true
      }
    ),
    modalOpen && /* @__PURE__ */ jsx18(
      MediaLibraryModal,
      {
        onClose: () => setModalOpen(false),
        onSelect: handleSelectMedia,
        name
      }
    )
  ] });
}

// src/components/templates/LoginPage.jsx
import { useState as useState9 } from "react";
import { useRouter as useRouter7 } from "next/navigation";
import { jsx as jsx19, jsxs as jsxs11 } from "react/jsx-runtime";
function LoginPage({ loginUrl = "/auth/login", redirectTo = "/admin/dashboard" }) {
  const [error, setError] = useState9(null);
  const [loading, setLoading] = useState9(false);
  const router = useRouter7();
  async function handleSubmit(values) {
    var _a, _b;
    setError(null);
    setLoading(true);
    const { apiBaseUrl } = getRuntimeConfig();
    const res = await fetch(`${apiBaseUrl}${loginUrl}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !(data == null ? void 0 : data.user)) {
      setError(((_b = (_a = data == null ? void 0 : data.errors) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) ?? "Invalid email or password");
      return;
    }
    router.push(redirectTo);
  }
  return /* @__PURE__ */ jsx19("div", { className: "flex h-screen items-center justify-center bg-gray-50", children: /* @__PURE__ */ jsxs11("div", { className: "w-1/2 rounded-lg border border-gray-200 bg-white p-8 shadow-sm", children: [
    /* @__PURE__ */ jsx19("h1", { className: "mb-6 text-xl font-semibold", children: "Log in" }),
    /* @__PURE__ */ jsxs11(Form, { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ jsx19(Input, { name: "email", type: "email", placeholder: "Email", required: true }),
      /* @__PURE__ */ jsx19(Input, { name: "password", type: "password", placeholder: "Password", required: true }),
      error && /* @__PURE__ */ jsx19("p", { className: "text-sm text-red-600", children: error }),
      /* @__PURE__ */ jsx19(
        "button",
        {
          type: "submit",
          disabled: loading,
          className: "mt-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50",
          children: loading ? "Logging in..." : "Log in"
        }
      )
    ] })
  ] }) });
}

// src/components/molecules/PayloadField.jsx
import { useState as useState11 } from "react";
import { Eye as Eye2, EyeOff } from "lucide-react";

// src/components/atoms/RelationshipField.jsx
import { useContext as useContext7, useEffect as useEffect9, useMemo as useMemo2, useRef as useRef5, useState as useState10 } from "react";
import { X as X3 } from "lucide-react";
import { jsx as jsx20, jsxs as jsxs12 } from "react/jsx-runtime";
function docLabel(doc) {
  return (doc == null ? void 0 : doc.name) ?? (doc == null ? void 0 : doc.title) ?? (doc == null ? void 0 : doc.id);
}
function toId(value) {
  if (value == null) return null;
  return typeof value === "object" ? value.id : value;
}
function normalizeDefaultDocs(value) {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => typeof v === "object" ? { id: v.id, label: docLabel(v) } : { id: v, label: null }).filter((v) => v.id != null);
}
function RelationshipField({ field }) {
  const { name, relationTo, label, required, hasMany } = field;
  const contextDefaults = useContext7(DefaultsContext);
  const { data, loading } = useGet(`/api/${relationTo}?limit=200`);
  const options = (data == null ? void 0 : data.docs) ?? [];
  if (hasMany) {
    return /* @__PURE__ */ jsx20(
      RelationshipMultiSelect,
      {
        name,
        label,
        required,
        loading,
        options,
        defaultValue: contextDefaults == null ? void 0 : contextDefaults[name]
      }
    );
  }
  const [selected, setSelected] = useState10(() => toId(contextDefaults == null ? void 0 : contextDefaults[name]) ?? "");
  return /* @__PURE__ */ jsxs12(
    Select,
    {
      name,
      placeholder: label,
      required,
      disabled: loading,
      value: selected,
      onChange: (e) => setSelected(e.target.value),
      children: [
        /* @__PURE__ */ jsx20("option", { value: "", children: "Select\u2026" }),
        options.map((doc) => /* @__PURE__ */ jsx20("option", { value: doc.id, children: docLabel(doc) }, doc.id))
      ]
    }
  );
}
function RelationshipMultiSelect({ name, label, required, loading, options, defaultValue }) {
  const defaultDocs = useMemo2(() => normalizeDefaultDocs(defaultValue), [defaultValue]);
  const [selectedIds, setSelectedIds] = useState10(() => defaultDocs.map((d) => d.id));
  const [query, setQuery] = useState10("");
  const [isOpen, setIsOpen] = useState10(false);
  const [highlightedIndex, setHighlightedIndex] = useState10(0);
  const containerRef = useRef5(null);
  const inputRef = useRef5(null);
  useEffect9(() => {
    setSelectedIds(defaultDocs.map((d) => d.id));
  }, [defaultDocs]);
  const labelForId = (id) => {
    const fromOptions = options.find((doc) => doc.id === id);
    if (fromOptions) return docLabel(fromOptions);
    const fromDefault = defaultDocs.find((d) => d.id === id);
    return (fromDefault == null ? void 0 : fromDefault.label) ?? id;
  };
  const filteredOptions = useMemo2(() => {
    const available = options.filter((doc) => !selectedIds.includes(doc.id));
    if (!query.trim()) return available;
    const q = query.trim().toLowerCase();
    return available.filter((doc) => {
      var _a;
      return (_a = docLabel(doc)) == null ? void 0 : _a.toLowerCase().includes(q);
    });
  }, [options, selectedIds, query]);
  useEffect9(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);
  useEffect9(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const addId = (id) => {
    var _a;
    setSelectedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
    setQuery("");
    (_a = inputRef.current) == null ? void 0 : _a.focus();
  };
  const removeId = (id) => {
    setSelectedIds((prev) => prev.filter((existing) => existing !== id));
  };
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const doc = filteredOptions[highlightedIndex];
      if (doc) addId(doc.id);
    } else if (e.key === "Backspace" && query === "" && selectedIds.length > 0) {
      removeId(selectedIds[selectedIds.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };
  return /* @__PURE__ */ jsxs12("div", { className: "group relative rounded-lg border border-gray-200 px-3 pb-2.5 pt-3.5 transition-colors focus-within:border-gray-900 hover:border-gray-300 focus-within:hover:border-gray-900", children: [
    /* @__PURE__ */ jsx20(
      "label",
      {
        htmlFor: name,
        className: "absolute -top-2 left-2.5 bg-white px-1 text-xs font-medium leading-none text-gray-500 transition-colors group-focus-within:text-gray-900",
        children: label
      }
    ),
    /* @__PURE__ */ jsxs12("div", { ref: containerRef, className: "relative", children: [
      /* @__PURE__ */ jsxs12("div", { className: "flex flex-wrap items-center gap-1.5", children: [
        selectedIds.map((id) => /* @__PURE__ */ jsxs12(
          "span",
          {
            className: "flex items-center gap-1 rounded-md bg-gray-100 py-1 pl-2 pr-1 text-xs font-medium text-gray-700",
            children: [
              labelForId(id),
              /* @__PURE__ */ jsx20(
                "button",
                {
                  type: "button",
                  onClick: () => removeId(id),
                  className: "rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700",
                  "aria-label": `Remove ${labelForId(id)}`,
                  children: /* @__PURE__ */ jsx20(X3, { size: 12 })
                }
              )
            ]
          },
          id
        )),
        /* @__PURE__ */ jsx20(
          "input",
          {
            ref: inputRef,
            id: name,
            type: "text",
            value: query,
            disabled: loading,
            placeholder: loading ? "Loading\u2026" : selectedIds.length ? "" : "Search\u2026",
            onChange: (e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            },
            onFocus: () => setIsOpen(true),
            onKeyDown: handleKeyDown,
            className: "min-w-[80px] flex-1 border-none bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
          }
        )
      ] }),
      isOpen && !loading && /* @__PURE__ */ jsx20("div", { className: "absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg", children: filteredOptions.length === 0 ? /* @__PURE__ */ jsx20("div", { className: "px-3 py-2 text-sm text-gray-400", children: options.length === 0 ? "No options available" : "No matches" }) : filteredOptions.map((doc, i) => /* @__PURE__ */ jsx20(
        "button",
        {
          type: "button",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => addId(doc.id),
          onMouseEnter: () => setHighlightedIndex(i),
          className: `block w-full px-3 py-2 text-left text-sm transition-colors ${i === highlightedIndex ? "bg-gray-100 text-gray-900" : "text-gray-700"}`,
          children: docLabel(doc)
        },
        doc.id
      )) })
    ] }),
    selectedIds.map((id) => /* @__PURE__ */ jsx20("input", { type: "hidden", name: `${name}[]`, value: id }, id)),
    required && /* @__PURE__ */ jsx20(
      "input",
      {
        type: "text",
        required: true,
        value: selectedIds.length ? "valid" : "",
        onChange: () => {
        },
        className: "sr-only",
        tabIndex: -1,
        "aria-hidden": "true"
      }
    )
  ] });
}

// src/components/molecules/PayloadField.jsx
import { jsx as jsx21, jsxs as jsxs13 } from "react/jsx-runtime";
function PasswordInput({ name, placeholder, required }) {
  const [showPassword, setShowPassword] = useState11(false);
  return /* @__PURE__ */ jsxs13("div", { className: "relative w-full", children: [
    /* @__PURE__ */ jsx21(
      Input,
      {
        name,
        type: showPassword ? "text" : "password",
        placeholder,
        required,
        className: "pr-10"
      }
    ),
    /* @__PURE__ */ jsx21(
      "button",
      {
        type: "button",
        onClick: () => setShowPassword((prev) => !prev),
        className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 focus:outline-none",
        "aria-label": showPassword ? "Hide password" : "Show password",
        children: showPassword ? /* @__PURE__ */ jsx21(EyeOff, { size: 18 }) : /* @__PURE__ */ jsx21(Eye2, { size: 18 })
      }
    )
  ] });
}
function PayloadField({ field }) {
  const { name, type, label, required, options } = field;
  if (type === "select") {
    return /* @__PURE__ */ jsxs13(Select, { name, placeholder: label, required, children: [
      /* @__PURE__ */ jsx21("option", { value: "", children: "Select..." }),
      options.map((opt) => {
        const value = typeof opt === "string" ? opt : opt.value;
        const optLabel = typeof opt === "string" ? opt : opt.label;
        return /* @__PURE__ */ jsx21("option", { value, children: optLabel }, value);
      })
    ] });
  }
  if (type === "textarea") {
    return /* @__PURE__ */ jsx21(Textarea, { name, placeholder: label, required });
  }
  if (type === "email") {
    return /* @__PURE__ */ jsx21(Input, { name, type: "email", placeholder: label, required });
  }
  if (type === "number") {
    return /* @__PURE__ */ jsx21(Input, { name, type: "number", placeholder: label, required });
  }
  if (type === "password") {
    return /* @__PURE__ */ jsx21(PasswordInput, { name, placeholder: label, required });
  }
  if (type === "text") {
    return /* @__PURE__ */ jsx21(Input, { name, type: "text", placeholder: label, required });
  }
  if (type === "relationship") {
    return /* @__PURE__ */ jsx21(RelationshipField, { field });
  }
  console.warn(`No renderer for field type "${type}" \u2014 field "${name}" skipped`);
  return null;
}

// src/components/organisms/PayloadEntityForm.jsx
import { jsx as jsx22, jsxs as jsxs14 } from "react/jsx-runtime";
function PayloadEntityForm({ collectionFields, defaults, onSubmit, externalId = null }) {
  return /* @__PURE__ */ jsxs14(Form, { defaults, id: externalId, onSubmit, children: [
    collectionFields.map((field) => /* @__PURE__ */ jsx22(PayloadField, { field }, field.name)),
    !externalId && /* @__PURE__ */ jsx22("button", { type: "submit", children: "Save" })
  ] });
}

// src/components/organisms/DateTime.jsx
import { useState as useState12 } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsx as jsx23, jsxs as jsxs15 } from "react/jsx-runtime";
function DateTime({ defaultValue, name = "publishedAt", label = "Publish date" }) {
  const [publishedAt, setPublishedAt] = useState12(defaultValue ? new Date(defaultValue) : null);
  return /* @__PURE__ */ jsxs15("fieldset", { children: [
    label && /* @__PURE__ */ jsx23("legend", { children: label }),
    /* @__PURE__ */ jsx23(
      DatePicker,
      {
        selected: publishedAt,
        onChange: setPublishedAt,
        showTimeSelect: true,
        dateFormat: "MMM d, yyyy h:mm aa",
        isClearable: true,
        placeholderText: "Select date and time"
      }
    ),
    /* @__PURE__ */ jsx23("input", { type: "hidden", name, value: publishedAt ? publishedAt.toISOString() : "" })
  ] });
}

// src/components/organisms/LibraryImageBlock.jsx
import { useState as useState13 } from "react";
import { defaultProps } from "@blocknote/core";
import {
  ResizableFileBlockWrapper,
  createReactBlockSpec
} from "@blocknote/react";
import { ImageIcon as ImageIcon2 } from "lucide-react";
import { Fragment as Fragment3, jsx as jsx24, jsxs as jsxs16 } from "react/jsx-runtime";
var LibraryImageBlock = createReactBlockSpec(
  {
    type: "image",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      backgroundColor: defaultProps.backgroundColor,
      url: { default: "" },
      name: { default: "" },
      caption: { default: "" },
      // Required by ResizableFileBlockWrapper to support drag-to-resize.
      showPreview: { default: true },
      previewWidth: { default: void 0, type: "number" }
    },
    content: "none"
  },
  {
    // BlockNote's convention for file-type blocks (image/video/audio/file):
    // declare accepted mime types and use a File/ResizableFileBlockWrapper
    // in the render — this is what wires up resizing.
    meta: { fileBlockAccept: ["image/*"] },
    render: (props) => {
      const { block, editor } = props;
      const [modalOpen, setModalOpen] = useState13(() => !block.props.url);
      const handleSelect = (media) => {
        editor.updateBlock(block, {
          props: {
            url: resolveUrl(media),
            name: media.filename || ""
          }
        });
        setModalOpen(false);
      };
      const handleClose = () => {
        if (!block.props.url) {
          editor.removeBlocks([block.id]);
          return;
        }
        setModalOpen(false);
      };
      return /* @__PURE__ */ jsxs16(Fragment3, { children: [
        block.props.url ? (
          // Wrapping only the filled state gives us the native
          // drag-to-resize handles without reintroducing the native
          // "click to upload" empty-state button — the empty branch
          // below stays fully our own (library-only) UI.
          /* @__PURE__ */ jsx24(
            ResizableFileBlockWrapper,
            {
              ...props,
              buttonIcon: /* @__PURE__ */ jsx24(ImageIcon2, { size: 20 }),
              children: /* @__PURE__ */ jsx24(
                "img",
                {
                  src: block.props.url,
                  alt: block.props.name || "image",
                  title: "Click to replace image",
                  className: "library-image-block-img",
                  style: { width: "100%", height: "auto", display: "block" }
                }
              )
            }
          )
        ) : /* @__PURE__ */ jsxs16(
          "div",
          {
            className: "library-image-placeholder",
            contentEditable: false,
            onClick: () => setModalOpen(true),
            children: [
              /* @__PURE__ */ jsx24(ImageIcon2, { size: 22 }),
              /* @__PURE__ */ jsx24("span", { children: "Choose image from library" })
            ]
          }
        ),
        modalOpen && /* @__PURE__ */ jsx24(
          MediaLibraryModal,
          {
            onClose: handleClose,
            onSelect: handleSelect,
            name: "articleImage"
          }
        )
      ] });
    },
    // Used by editor.blocksToHTMLLossy() / blocksToFullHTML() when
    // serializing to static HTML (your getHtml() in BlockNote.jsx).
    // Without this, BlockNote falls back to statically rendering the
    // *editor* React tree above — which now includes the resize wrapper,
    // handles, and click-to-replace wiring, not a clean <img>. This keeps
    // exported/published HTML to a plain image tag.
    // Recognizes existing <img> tags (and the div.image-container wrapper
    // your getHtml() export produces) when loading initialHTML via
    // tryParseHTMLToBlocks. Without this, incoming images are silently
    // dropped since the custom block has no built-in HTML match rule.
    parse: (element) => {
      var _a;
      let img = null;
      if (element.tagName === "IMG") {
        img = element;
      } else if (element.tagName === "DIV" && ((_a = element.classList) == null ? void 0 : _a.contains("image-container"))) {
        img = element.querySelector("img");
      }
      if (!img) {
        return void 0;
      }
      return {
        url: img.getAttribute("src") || "",
        name: img.getAttribute("alt") || ""
      };
    },
    toExternalHTML: (props) => {
      const { block } = props;
      if (!block.props.url) {
        return /* @__PURE__ */ jsx24("p", {});
      }
      return /* @__PURE__ */ jsx24(
        "img",
        {
          src: block.props.url,
          alt: block.props.name || "",
          style: block.props.previewWidth ? { width: `${block.props.previewWidth}px` } : void 0
        }
      );
    }
  }
);

// src/components/organisms/ButtonBlock.jsx
import { useRef as useRef6, useState as useState14 } from "react";
import { createReactBlockSpec as createReactBlockSpec2 } from "@blocknote/react";
import { jsx as jsx25, jsxs as jsxs17 } from "react/jsx-runtime";
var ButtonBlock = createReactBlockSpec2(
  {
    type: "button",
    propSchema: {
      text: { default: "Click me" },
      url: { default: "" },
      variant: { default: "primary" }
      // primary | secondary | outline
    },
    content: "none"
  },
  {
    // How it looks INSIDE the editor while editing
    render: (props) => {
      const { text, url, variant } = props.block.props;
      const containerRef = useRef6(null);
      const [focused, setFocused] = useState14(false);
      const handleFocus = () => setFocused(true);
      const handleBlur = (e) => {
        var _a;
        if (!((_a = containerRef.current) == null ? void 0 : _a.contains(e.relatedTarget))) {
          setFocused(false);
        }
      };
      return /* @__PURE__ */ jsxs17(
        "div",
        {
          ref: containerRef,
          className: "cta-editor-block",
          style: { position: "relative", display: "inline-block" },
          onFocus: handleFocus,
          onBlur: handleBlur,
          contentEditable: false,
          children: [
            /* @__PURE__ */ jsx25(
              "input",
              {
                className: `cta-button cta-button--${variant}`,
                value: text,
                placeholder: "Button text",
                onChange: (e) => props.editor.updateBlock(props.block, {
                  props: { text: e.target.value }
                })
              }
            ),
            focused && /* @__PURE__ */ jsxs17(
              "div",
              {
                className: "cta-editor-overlay",
                style: {
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "6px",
                  display: "flex",
                  gap: "8px",
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                  padding: "8px",
                  zIndex: 1e3
                },
                children: [
                  /* @__PURE__ */ jsx25(
                    "input",
                    {
                      className: "cta-editor-block__url",
                      value: url,
                      placeholder: "https://...",
                      onChange: (e) => props.editor.updateBlock(props.block, {
                        props: { url: e.target.value }
                      })
                    }
                  ),
                  /* @__PURE__ */ jsxs17(
                    "select",
                    {
                      className: "cta-editor-block__variant",
                      value: variant,
                      onChange: (e) => props.editor.updateBlock(props.block, {
                        props: { variant: e.target.value }
                      }),
                      children: [
                        /* @__PURE__ */ jsx25("option", { value: "primary", children: "Primary" }),
                        /* @__PURE__ */ jsx25("option", { value: "secondary", children: "Secondary" }),
                        /* @__PURE__ */ jsx25("option", { value: "outline", children: "Outline" })
                      ]
                    }
                  )
                ]
              }
            )
          ]
        }
      );
    },
    // What actually gets saved as HTML for the public site
    toExternalHTML: (props) => {
      const { text, url, variant } = props.block.props;
      return /* @__PURE__ */ jsx25("a", { href: url, className: `cta-button cta-button--${variant}`, children: text });
    }
  }
);

// src/components/organisms/EmbedBlock.jsx
import { useState as useState15 } from "react";
import { createReactBlockSpec as createReactBlockSpec3 } from "@blocknote/react";
import { jsx as jsx26, jsxs as jsxs18 } from "react/jsx-runtime";
function extractUrl(value) {
  var _a;
  const trimmed = value.trim();
  if (!/^<iframe[\s>]/i.test(trimmed) || typeof window === "undefined") {
    return trimmed;
  }
  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  const iframe = doc.querySelector("iframe");
  return ((_a = iframe == null ? void 0 : iframe.getAttribute("src")) == null ? void 0 : _a.trim()) || trimmed;
}
var EmbedBlock = createReactBlockSpec3(
  {
    type: "embed",
    propSchema: {
      url: { default: "" }
    },
    content: "none"
  },
  {
    render: (props) => {
      const { block, editor } = props;
      const [editing, setEditing] = useState15(!block.props.url);
      const [inputValue, setInputValue] = useState15(block.props.url || "");
      const commitUrl = () => {
        const trimmed = inputValue.trim();
        if (trimmed) {
          editor.updateBlock(block, { props: { url: extractUrl(trimmed) } });
          setEditing(false);
          return;
        }
        if (!block.props.url) {
          editor.removeBlocks([block.id]);
        } else {
          setEditing(false);
        }
      };
      const handleKeyDown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitUrl();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setInputValue(block.props.url || "");
          if (!block.props.url) {
            editor.removeBlocks([block.id]);
          } else {
            setEditing(false);
          }
        }
      };
      if (editing) {
        return /* @__PURE__ */ jsx26("div", { className: "w-full", contentEditable: false, children: /* @__PURE__ */ jsx26(
          "input",
          {
            autoFocus: true,
            className: "w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-solid focus:border-blue-600 focus:bg-white",
            value: inputValue,
            placeholder: "Paste a URL or an <iframe> embed code and press Enter\u2026",
            onChange: (e) => setInputValue(e.target.value),
            onKeyDown: handleKeyDown,
            onBlur: commitUrl
          }
        ) });
      }
      return /* @__PURE__ */ jsxs18(
        "div",
        {
          className: "group relative w-full overflow-hidden rounded-lg",
          contentEditable: false,
          children: [
            /* @__PURE__ */ jsx26(
              "iframe",
              {
                src: block.props.url,
                className: "block aspect-video w-full rounded-lg border-0 bg-black",
                loading: "lazy",
                allowFullScreen: true
              }
            ),
            /* @__PURE__ */ jsx26(
              "button",
              {
                type: "button",
                className: "absolute right-2 top-2 rounded border border-white/40 bg-slate-900/65 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-slate-900/85 group-hover:opacity-100",
                onClick: () => {
                  setInputValue(block.props.url);
                  setEditing(true);
                },
                title: "Replace embed URL",
                children: "Replace"
              }
            )
          ]
        }
      );
    },
    // Recognizes <iframe> tags (bare, or wrapped in our exported
    // div.embed-container) when loading initialHTML.
    parse: (element) => {
      var _a;
      if (element.tagName === "IFRAME") {
        return { url: element.getAttribute("src") || "" };
      }
      if (element.tagName === "DIV" && ((_a = element.classList) == null ? void 0 : _a.contains("embed-container"))) {
        const iframe = element.querySelector("iframe");
        if (iframe) {
          return { url: iframe.getAttribute("src") || "" };
        }
      }
      return void 0;
    },
    // Clean static markup for the published site.
    toExternalHTML: (props) => {
      const { url } = props.block.props;
      if (!url) {
        return /* @__PURE__ */ jsx26("p", {});
      }
      return /* @__PURE__ */ jsx26("div", { className: "embed-container relative aspect-video w-full overflow-hidden rounded-lg [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0", children: /* @__PURE__ */ jsx26("iframe", { src: url, loading: "lazy", allowFullScreen: true }) });
    }
  }
);

// src/components/organisms/BlockNote.jsx
import { forwardRef, useEffect as useEffect10, useImperativeHandle, useState as useState16 } from "react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu
} from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
  useSelectedBlocks
} from "@blocknote/react";
import { Frame, ImageIcon as ImageIcon3, Link2 as Link22 } from "lucide-react";
import { jsx as jsx27, jsxs as jsxs19 } from "react/jsx-runtime";
var schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    button: ButtonBlock(),
    image: LibraryImageBlock(),
    embed: EmbedBlock()
  }
});
var SEO_REL_OPTIONS = ["nofollow", "noindex", "noimageindex", "noarchive", "nosnippet"];
var FILE_TOOLBAR_BLOCK_TYPES = ["video", "audio", "file"];
function ArticleFormattingToolbar({ editor }) {
  const selectedBlocks = useSelectedBlocks(editor);
  const blockType = selectedBlocks.length === 1 ? selectedBlocks[0].type : void 0;
  const allowFileButtons = FILE_TOOLBAR_BLOCK_TYPES.includes(blockType);
  const items = getFormattingToolbarItems().filter((item) => {
    const key = typeof item.key === "string" ? item.key.toLowerCase() : "";
    const isFileButton = key.includes("file");
    return allowFileButtons || !isFileButton;
  });
  return /* @__PURE__ */ jsx27(FormattingToolbar, { children: items });
}
var ArticleEditor = forwardRef(function ArticleEditor2({ initialHTML }, ref) {
  const { post } = useApi();
  const [loaded, setLoaded] = useState16(false);
  const [linkRels, setLinkRels] = useState16({});
  const [activeLinkInfo, setActiveLinkInfo] = useState16(null);
  const editor = useCreateBlockNote({
    schema,
    // Still used by other upload-capable blocks (file/video/audio) if present.
    // No longer used by "image" — that block only inserts via the media library.
    uploadFile: async (file) => {
      const { host } = getRuntimeConfig();
      const formData = new FormData();
      formData.append("UploadFiles", file);
      const res = await post("/articles/image", formData);
      return `${host}/uploads/articles/images/${res.name}`;
    }
  });
  useEffect10(() => {
    async function loadContent() {
      if (initialHTML && typeof window !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialHTML, "text/html");
        const extractedRels = {};
        doc.querySelectorAll("a[href]").forEach((a) => {
          const href = a.getAttribute("href");
          const rel = a.getAttribute("rel") || "";
          if (href && rel) {
            const rels = rel.toLowerCase().split(/\s+/).filter((r) => SEO_REL_OPTIONS.includes(r));
            if (rels.length) {
              extractedRels[href] = rels;
            }
          }
        });
        if (Object.keys(extractedRels).length) {
          setLinkRels(extractedRels);
        }
        const blocks = await editor.tryParseHTMLToBlocks(initialHTML);
        editor.replaceBlocks(editor.document, blocks);
      }
      setLoaded(true);
    }
    loadContent();
  }, [initialHTML, editor]);
  const handleEditorMouseOver = (e) => {
    const a = e.target.closest("a[href]");
    if (a) {
      const href = a.getAttribute("href");
      const rect = a.getBoundingClientRect();
      setActiveLinkInfo({ href, rect });
    }
  };
  const handleEditorMouseOut = (e) => {
    const a = e.target.closest("a[href]");
    if (a) {
      const related = e.relatedTarget;
      if (!related || !related.closest || !related.closest(".link-rel-menu")) {
        setActiveLinkInfo(null);
      }
    }
  };
  const toggleRel = (rel) => {
    if (!activeLinkInfo) return;
    setLinkRels((prev) => {
      const current = prev[activeLinkInfo.href] || [];
      const exists = current.includes(rel);
      const next = exists ? current.filter((r) => r !== rel) : [...current, rel];
      return { ...prev, [activeLinkInfo.href]: next };
    });
  };
  useImperativeHandle(ref, () => ({
    getHtml: async () => {
      let html = await editor.blocksToHTMLLossy(editor.document);
      if (typeof window !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        if (Object.keys(linkRels).length > 0) {
          doc.querySelectorAll("a[href]").forEach((a) => {
            const href = a.getAttribute("href");
            const rels = linkRels[href];
            if (rels && rels.length > 0) {
              a.setAttribute("rel", rels.join(" "));
            }
          });
        }
        doc.querySelectorAll("img").forEach((img) => {
          var _a;
          if ((_a = img.parentElement) == null ? void 0 : _a.classList.contains("image-container")) {
            return;
          }
          const wrapper = doc.createElement("div");
          wrapper.className = "image-container";
          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        });
        html = doc.body.innerHTML;
      }
      return html;
    },
    getBlocks: () => {
      return editor.document;
    },
    getLinkRels: () => {
      return linkRels;
    }
  }));
  if (!loaded) return /* @__PURE__ */ jsx27("p", { children: "Loading editor..." });
  return /* @__PURE__ */ jsxs19(
    "div",
    {
      style: { position: "relative" },
      onMouseOver: handleEditorMouseOver,
      onMouseOut: handleEditorMouseOut,
      children: [
        /* @__PURE__ */ jsxs19(BlockNoteView, { editor, slashMenu: false, formattingToolbar: false, theme: "light", children: [
          /* @__PURE__ */ jsx27(
            FormattingToolbarController,
            {
              formattingToolbar: () => /* @__PURE__ */ jsx27(ArticleFormattingToolbar, { editor })
            }
          ),
          /* @__PURE__ */ jsx27(
            SuggestionMenuController,
            {
              triggerCharacter: "/",
              getItems: async (query) => filterSuggestionItems(
                [
                  // The default "Image" item also opens BlockNote's native
                  // file panel directly, bypassing our block's own render.
                  // Drop it and insert the block ourselves instead, so only
                  // LibraryImageBlock's placeholder/media-library flow runs.
                  ...getDefaultReactSlashMenuItems(editor).filter((item) => item.title !== "Image"),
                  {
                    title: "Image",
                    subtext: "Insert an image from the media library",
                    group: "custom",
                    icon: /* @__PURE__ */ jsx27(ImageIcon3, { size: 18 }),
                    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {
                      type: "image"
                    }),
                    aliases: ["image", "img", "picture", "photo", "media"]
                  },
                  {
                    title: "Button",
                    subtext: "Insert a call-to-action button",
                    group: "custom",
                    icon: /* @__PURE__ */ jsx27(Link22, { size: 18 }),
                    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {
                      type: "button"
                    }),
                    aliases: ["button", "cta", "link"]
                  },
                  {
                    title: "Embed",
                    subtext: "Embed content from a URL (iframe)",
                    group: "custom",
                    icon: /* @__PURE__ */ jsx27(Frame, { size: 18 }),
                    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {
                      type: "embed"
                    }),
                    aliases: ["embed", "iframe", "url"]
                  }
                ],
                query
              )
            }
          )
        ] }),
        activeLinkInfo && /* @__PURE__ */ jsx27(
          "div",
          {
            className: "link-rel-menu",
            style: {
              position: "fixed",
              top: activeLinkInfo.rect.bottom,
              left: activeLinkInfo.rect.left,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              padding: "8px",
              display: "flex",
              gap: "12px",
              zIndex: 1e3
            },
            onMouseLeave: () => setActiveLinkInfo(null),
            children: SEO_REL_OPTIONS.map((rel) => /* @__PURE__ */ jsxs19(
              "label",
              {
                onMouseDown: (e) => e.preventDefault(),
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  cursor: "pointer"
                },
                children: [
                  /* @__PURE__ */ jsx27(
                    "input",
                    {
                      type: "checkbox",
                      checked: (linkRels[activeLinkInfo.href] || []).includes(rel),
                      onChange: () => toggleRel(rel),
                      onMouseDown: (e) => e.preventDefault()
                    }
                  ),
                  rel
                ]
              },
              rel
            ))
          }
        )
      ]
    }
  );
});
var BlockNote_default = ArticleEditor;

// src/components/organisms/SchemaEditor.jsx
import { useEffect as useEffect11, useMemo as useMemo3, useRef as useRef7, useState as useState17 } from "react";
import { Copy, RotateCw as RotateCw2 } from "lucide-react";
import { jsx as jsx28, jsxs as jsxs20 } from "react/jsx-runtime";
var LOCKED_KEYS = ["@context", "@graph"];
function SchemaEditor({ schema: schema2, inputName = "schema" }) {
  const autoJsonString = useMemo3(() => JSON.stringify(schema2, null, 2), [schema2]);
  const nextRowId = useRef7(0);
  const [rows, setRows] = useState17(() => schemaToRows(schema2, nextRowId));
  const [isManualEdit, setIsManualEdit] = useState17(false);
  const [rowErrors, setRowErrors] = useState17({});
  const [copied, setCopied] = useState17(false);
  function schemaToRows(obj, idRef) {
    return LOCKED_KEYS.filter((key) => obj[key] !== void 0).map((key) => {
      const value = obj[key];
      return {
        id: idRef.current++,
        key,
        value: typeof value === "string" ? value : JSON.stringify(value, null, 2)
      };
    });
  }
  useEffect11(() => {
    if (isManualEdit) return;
    setRows((prevRows) => {
      const prevByKey = new Map(prevRows.map((r) => [r.key, r]));
      return LOCKED_KEYS.filter((key) => schema2[key] !== void 0).map((key) => {
        const value = schema2[key];
        const strValue = typeof value === "string" ? value : JSON.stringify(value, null, 2);
        const existing = prevByKey.get(key);
        return {
          id: existing ? existing.id : nextRowId.current++,
          key,
          value: strValue
        };
      });
    });
  }, [schema2, isManualEdit]);
  function updateRowValue(id, value) {
    setIsManualEdit(true);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, value } : r));
    const trimmed = value.trim();
    const row = rows.find((r) => r.id === id);
    const isGraphRow = (row == null ? void 0 : row.key) === "@graph";
    if (isGraphRow) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) throw new Error("not an array");
        setRowErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (e) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: "@graph must be a valid JSON array"
        }));
      }
    } else {
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }
  function resetToAuto() {
    setIsManualEdit(false);
    setRows(schemaToRows(schema2, nextRowId));
    setRowErrors({});
  }
  const builtSchema = useMemo3(() => {
    const obj = {};
    for (const { key, value } of rows) {
      const trimmed = value.trim();
      if (key === "@graph") {
        try {
          obj[key] = JSON.parse(trimmed);
          continue;
        } catch (e) {
          continue;
        }
      }
      obj[key] = value;
    }
    return obj;
  }, [rows]);
  const hasRowErrors = Object.keys(rowErrors).length > 0;
  const submittedJson = useMemo3(
    () => hasRowErrors ? autoJsonString : JSON.stringify(builtSchema, null, 2),
    [hasRowErrors, autoJsonString, builtSchema]
  );
  async function handleCopy() {
    const scriptTag = `<script type="application/ld+json">
${submittedJson}
</script>`;
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
    }
  }
  return /* @__PURE__ */ jsxs20("div", { className: "gap-xs flex-col", style: { marginBlock: "1rem" }, children: [
    /* @__PURE__ */ jsxs20("div", { className: "flex-between", style: { alignItems: "center" }, children: [
      /* @__PURE__ */ jsx28("strong", { children: "Schema markup" }),
      /* @__PURE__ */ jsxs20("div", { className: "gap-sm flex", children: [
        !hasRowErrors && /* @__PURE__ */ jsxs20(
          "button",
          {
            type: "button",
            style: { gap: "0.5rem" },
            className: "multi-entry__add flex-center",
            onClick: handleCopy,
            disabled: hasRowErrors,
            title: hasRowErrors ? "Fix invalid values before copying" : void 0,
            children: [
              /* @__PURE__ */ jsx28(Copy, { size: 18 }),
              copied ? "Copied" : "Copy schema"
            ]
          }
        ),
        isManualEdit && /* @__PURE__ */ jsxs20(
          "button",
          {
            type: "button",
            style: { gap: "0.5rem" },
            className: "multi-entry__add flex-center",
            onClick: resetToAuto,
            children: [
              /* @__PURE__ */ jsx28(RotateCw2, { size: 18 }),
              "Reset to auto-generated"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs20("div", { className: "gap flex", style: { flexWrap: "wrap", alignItems: "flex-start" }, children: [
      /* @__PURE__ */ jsxs20("div", { className: "gap-xs flex-col", style: { flex: 1, minWidth: 320 }, children: [
        rows.map((row) => /* @__PURE__ */ jsxs20("div", { className: "gap-xs flex-col", children: [
          /* @__PURE__ */ jsx28("label", { className: "text-xs", style: { fontWeight: 600, fontSize: 14 }, children: row.key }),
          row.key === "@context" ? /* @__PURE__ */ jsx28(Input, { value: row.value, onChange: (e) => updateRowValue(row.id, e.target.value) }) : /* @__PURE__ */ jsx28(
            "textarea",
            {
              className: "rounded-md p-2 text-xs leading-relaxed",
              style: {
                width: "100%",
                minHeight: 360,
                maxHeight: 520,
                fontFamily: "monospace",
                border: rowErrors[row.id] ? "1px solid #e24b4a" : "1px solid transparent"
              },
              value: row.value,
              onChange: (e) => updateRowValue(row.id, e.target.value),
              spellCheck: false
            }
          ),
          rowErrors[row.id] && /* @__PURE__ */ jsxs20("span", { className: "text-xs", style: { color: "#e24b4a", fontSize: "0.8rem" }, children: [
            "*",
            rowErrors[row.id]
          ] })
        ] }, row.id)),
        /* @__PURE__ */ jsx28("span", { className: "tip", children: "Tip: You can edit the JSON directly in here." }),
        isManualEdit && !hasRowErrors && /* @__PURE__ */ jsx28("span", { className: "text-xs", style: { color: "Orange" }, children: "Manual editing mode" })
      ] }),
      /* @__PURE__ */ jsxs20("div", { style: { flex: 1, minWidth: 320 }, children: [
        /* @__PURE__ */ jsx28(
          "label",
          {
            style: {
              fontWeight: 600,
              display: "block",
              fontSize: 14,
              marginBottom: 8
            },
            children: "Live preview"
          }
        ),
        /* @__PURE__ */ jsx28(
          "pre",
          {
            className: "overflow-auto rounded-md bg-gray-900 p-4 text-xs leading-relaxed text-gray-100",
            style: {
              minHeight: 360,
              maxHeight: 520,
              overflow: "auto",
              backgroundColor: "#f0f0f0",
              color: "#000",
              fontSize: 12,
              borderRadius: "10px",
              padding: "10px"
            },
            children: `<script type="application/ld+json">
${submittedJson}
</script>`
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx28("input", { type: "hidden", name: inputName, value: submittedJson, readOnly: true })
  ] });
}

// src/components/templates/PostForm.jsx
import { useEffect as useEffect12, useMemo as useMemo4, useRef as useRef8, useState as useState18 } from "react";
import { ChevronDown, Eye as Eye3, Loader2 as Loader22, Plus as Plus2 } from "lucide-react";

// src/lib/jsonld.js
var SITE_URL = "https://abroadkhabar.com";
var LOGO_URL = `${SITE_URL}/favicon.ico`;
function toNepalISO(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const offset = 345;
    const local = new Date(d.getTime() + offset * 60 * 1e3);
    const iso = local.toISOString().replace("Z", "");
    return `${iso.slice(0, 19)}+05:45`;
  } catch {
    return null;
  }
}
function clean(obj) {
  if (obj === null || obj === void 0 || obj === "") return void 0;
  if (Array.isArray(obj)) {
    const cleaned = obj.map(clean).filter((x) => x !== void 0);
    return cleaned.length > 0 ? cleaned : void 0;
  }
  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = clean(value);
      if (cleaned !== void 0) result[key] = cleaned;
    }
    return Object.keys(result).length > 0 ? result : void 0;
  }
  return obj;
}
function articleSchema({
  url,
  title,
  excerpt,
  publishedAt,
  updatedAt,
  imageUrl,
  authorName,
  authorUrl,
  categoryName,
  categoryUrl
}) {
  const articleUrl = url || SITE_URL;
  const graph = [
    clean({
      "@type": "Article",
      "@id": `${articleUrl}/#article`,
      headline: title,
      description: excerpt,
      url: articleUrl,
      datePublished: toNepalISO(publishedAt),
      dateModified: toNepalISO(updatedAt || publishedAt),
      image: imageUrl ? [imageUrl] : void 0,
      author: authorName ? {
        "@type": "Person",
        name: authorName,
        ...authorUrl ? { url: authorUrl } : {}
      } : void 0,
      publisher: { "@id": `${SITE_URL}/#organization` }
    })
  ];
  const breadcrumbItems = [{ position: 1, name: "Home", item: SITE_URL }];
  if (categoryName && categoryUrl) {
    breadcrumbItems.push({
      position: 2,
      name: categoryName,
      item: categoryUrl
    });
  }
  breadcrumbItems.push({ position: breadcrumbItems.length + 1, name: title });
  graph.push(
    clean({
      "@type": "BreadcrumbList",
      "@id": `${articleUrl}/#breadcrumbs`,
      itemListElement: breadcrumbItems.map(
        (crumb) => clean({
          "@type": "ListItem",
          position: crumb.position,
          name: crumb.name,
          ...crumb.item ? { item: crumb.item } : {}
        })
      )
    })
  );
  return clean({
    "@context": "https://schema.org",
    "@graph": graph
  });
}
function newsArticleSchema({
  url,
  title,
  excerpt,
  publishedAt,
  updatedAt,
  images: imageUrls,
  authorName,
  authorUrl,
  categoryName,
  categoryUrl
}) {
  const articleUrl = url || SITE_URL;
  const graph = [
    clean({
      "@type": "NewsArticle",
      "@id": `${articleUrl}/#article`,
      headline: title,
      description: excerpt,
      url: articleUrl,
      datePublished: toNepalISO(publishedAt),
      dateModified: toNepalISO(updatedAt || publishedAt),
      image: imageUrls && imageUrls.length > 0 ? imageUrls : void 0,
      author: authorName ? {
        "@type": "Person",
        name: authorName,
        ...authorUrl ? { url: authorUrl } : {}
      } : void 0,
      publisher: { "@id": `${SITE_URL}/#organization` }
    })
  ];
  const breadcrumbItems = [{ position: 1, name: "Home", item: SITE_URL }];
  if (categoryName && categoryUrl) {
    breadcrumbItems.push({
      position: 2,
      name: categoryName,
      item: categoryUrl
    });
  }
  breadcrumbItems.push({ position: breadcrumbItems.length + 1, name: title });
  graph.push(
    clean({
      "@type": "BreadcrumbList",
      "@id": `${articleUrl}/#breadcrumbs`,
      itemListElement: breadcrumbItems.map(
        (crumb) => clean({
          "@type": "ListItem",
          position: crumb.position,
          name: crumb.name,
          ...crumb.item ? { item: crumb.item } : {}
        })
      )
    })
  );
  return clean({
    "@context": "https://schema.org",
    "@graph": graph
  });
}

// src/components/molecules/InputFields.jsx
import { Fragment as Fragment4, jsx as jsx29 } from "react/jsx-runtime";
var typeMap = {
  text: Textarea
};
function InputFields({ fields, className }) {
  return /* @__PURE__ */ jsx29(Fragment4, { children: fields.map((field, i) => {
    const isObject = typeof field === "object";
    const rawName = isObject ? field.name : field;
    const [name, shorthandType] = rawName.split(":");
    const Component = typeMap[shorthandType] ?? Input;
    return /* @__PURE__ */ jsx29(
      Component,
      {
        className,
        ...isObject ? field : {},
        name
      },
      name ?? i
    );
  }) });
}

// src/components/templates/PostForm.jsx
import { Fragment as Fragment5, jsx as jsx30, jsxs as jsxs21 } from "react/jsx-runtime";
var publishroles = ["admin", "editor", "junior_editor"];
function canPublish(role) {
  if (!role) return false;
  return publishroles.includes(role);
}
function PostForm({ defaults = null, onSubmit }) {
  const isEdit = defaults ? true : false;
  const rteRef = useRef8(null);
  const { post, patch } = useApi();
  const { user } = useAuth();
  const toast = useToast();
  const { apiBaseUrl, host } = getRuntimeConfig();
  const siteUrl = host;
  const [slug, setSlug] = useState18((defaults == null ? void 0 : defaults.slug) ?? "");
  const [tags, setTags] = useState18((defaults == null ? void 0 : defaults.tags) ? defaults.tags.split(",") : []);
  const [saveAction, setSaveAction] = useState18((defaults == null ? void 0 : defaults.status) ?? "draft");
  const [saveDrop, setSaveDrop] = useState18(false);
  const [title, setTitle] = useState18((defaults == null ? void 0 : defaults.title) ?? "");
  const [excerpt, setExcerpt] = useState18((defaults == null ? void 0 : defaults.metaDescription) ?? (defaults == null ? void 0 : defaults.excerpt) ?? "");
  const [ogDescription, setOgDescription] = useState18((defaults == null ? void 0 : defaults.ogDescription) ?? (defaults == null ? void 0 : defaults.og_description) ?? "");
  const [contentType, setContentType] = useState18((defaults == null ? void 0 : defaults.content_type) ?? "news");
  const [authorId, setAuthorId] = useState18((defaults == null ? void 0 : defaults.authorId) ?? (defaults == null ? void 0 : defaults.author_id) ?? "");
  const [authorUrl, setAuthorUrl] = useState18((defaults == null ? void 0 : defaults.authorUrl) ?? (defaults == null ? void 0 : defaults.author_url) ?? "");
  const [activeTab, setActiveTab] = useState18(0);
  const [thumbnailPreview, setThumbnailPreview] = useState18((defaults == null ? void 0 : defaults.thumbnail_url) ?? null);
  const [thumbnailId, setThumbnailId] = useState18((defaults == null ? void 0 : defaults.thumbnail) ?? null);
  const [coverPreview, setCoverPreview] = useState18((defaults == null ? void 0 : defaults.cover_image_url) ?? null);
  const [ogPreview, setOgPreview] = useState18((defaults == null ? void 0 : defaults.og_image_url) ?? null);
  const [loading, setLoading] = useState18(false);
  const [formKey, setFormKey] = useState18(0);
  useEffect12(() => {
    if (!defaults) return;
    setSlug((defaults == null ? void 0 : defaults.slug) ?? "");
    setTags((defaults == null ? void 0 : defaults.tags) ? defaults.tags.split(",") : []);
    setTitle((defaults == null ? void 0 : defaults.title) ?? "");
    setExcerpt((defaults == null ? void 0 : defaults.metaDescription) ?? (defaults == null ? void 0 : defaults.excerpt) ?? "");
    setOgDescription((defaults == null ? void 0 : defaults.ogDescription) ?? (defaults == null ? void 0 : defaults.og_description) ?? "");
    setContentType((defaults == null ? void 0 : defaults.content_type) ?? "news");
    setAuthorId((defaults == null ? void 0 : defaults.authorId) ?? (defaults == null ? void 0 : defaults.author_id) ?? "");
    setAuthorUrl((defaults == null ? void 0 : defaults.authorUrl) ?? (defaults == null ? void 0 : defaults.author_url) ?? "");
    setThumbnailPreview((defaults == null ? void 0 : defaults.thumbnail_url) ?? null);
    setThumbnailId((defaults == null ? void 0 : defaults.thumbnail) ?? null);
    setCoverPreview((defaults == null ? void 0 : defaults.cover_image_url) ?? null);
    setOgPreview((defaults == null ? void 0 : defaults.og_image_url) ?? null);
    setSaveAction((defaults == null ? void 0 : defaults.status) ?? "draft");
  }, [defaults]);
  const schemaDescription = ogDescription.trim() || excerpt;
  const schemaImages = useMemo4(() => {
    const candidates = [ogPreview, coverPreview, thumbnailPreview];
    const seen = /* @__PURE__ */ new Set();
    const images = [];
    for (const url of candidates) {
      if (url && !seen.has(url) && !url.startsWith("blob:")) {
        seen.add(url);
        images.push(url);
      }
    }
    return images;
  }, [ogPreview, coverPreview, thumbnailPreview]);
  const schema2 = useMemo4(() => {
    const postUrl = slug ? `${siteUrl}/${contentType}/${slug}` : siteUrl;
    const shared = {
      url: postUrl,
      title,
      excerpt: schemaDescription,
      publishedAt: (defaults == null ? void 0 : defaults.published_at) ?? (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (contentType === "article") {
      return articleSchema({ ...shared, imageUrl: schemaImages[0] ?? null });
    }
    return newsArticleSchema({ ...shared, images: schemaImages });
  }, [
    contentType,
    slug,
    schemaImages,
    title,
    schemaDescription,
    defaults,
    siteUrl
  ]);
  const handleSubmit = async (formDataValues) => {
    var _a;
    const content = await ((_a = rteRef.current) == null ? void 0 : _a.getHtml()) ?? "";
    if (!(title == null ? void 0 : title.trim())) {
      toast.error("Please enter a blog title.");
      return;
    }
    if (!(content == null ? void 0 : content.trim())) {
      toast.error("Please enter content for the blog.");
      return;
    }
    const resolvedStatus = formDataValues.action || saveAction || "draft";
    const selectedThumbnail = thumbnailId || (isUuid(formDataValues.thumbnail_id) ? formDataValues.thumbnail_id : isUuid(formDataValues.thumbnail) ? formDataValues.thumbnail : void 0);
    const rawPayload = {
      title: title.trim(),
      content: content.trim(),
      status: resolvedStatus === "published" ? "published" : "draft",
      metaTitle: formDataValues.meta_title || void 0,
      metaDescription: formDataValues.meta_description || excerpt || void 0,
      canonicalUrl: formDataValues.canonical_url || void 0,
      ogTitle: formDataValues.og_title || title || void 0,
      ogDescription: ogDescription || excerpt || void 0,
      redirectUrl: formDataValues.redirect_url || void 0,
      thumbnail: selectedThumbnail,
      schema: schema2 ? JSON.stringify(schema2) : void 0
    };
    const cleanPayload = removeEmptyFields(rawPayload);
    setLoading(true);
    try {
      const url = isEdit ? `/blogs/${defaults == null ? void 0 : defaults.id}` : `/blogs`;
      const res = isEdit ? await patch(url, cleanPayload, {
        success: (res2) => {
          toast.success(isEdit ? "Blog updated successfully!" : "Blog created successfully!");
          setFormKey((prev) => prev + 1);
          onSubmit == null ? void 0 : onSubmit(res2);
        }
      }) : await post(url, cleanPayload, {
        success: (res2) => {
          toast.success(isEdit ? "Blog updated successfully!" : "Blog created successfully!");
          setFormKey((prev) => prev + 1);
          onSubmit == null ? void 0 : onSubmit(res2);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to save blog. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsx30("div", { className: "flex h-screen flex-col overflow-hidden bg-white font-sans text-gray-900", children: /* @__PURE__ */ jsxs21(
    Form,
    {
      defaults: defaults ?? {},
      onSubmit: handleSubmit,
      className: "flex h-full flex-col overflow-hidden",
      children: [
        /* @__PURE__ */ jsxs21("div", { className: "relative flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4", children: [
          /* @__PURE__ */ jsxs21("div", { className: "flex items-center gap-4 text-sm text-gray-500", children: [
            /* @__PURE__ */ jsxs21("span", { children: [
              "Status:",
              " ",
              /* @__PURE__ */ jsx30("strong", { className: "font-medium text-gray-900 capitalize", children: (defaults == null ? void 0 : defaults.status) || "Draft" })
            ] }),
            /* @__PURE__ */ jsx30("span", { className: "hidden lg:inline", children: "Last saved 3hr ago" }),
            (defaults == null ? void 0 : defaults.published_at) && /* @__PURE__ */ jsxs21("span", { className: "hidden xl:inline", children: [
              "Created: ",
              new Date(defaults.published_at).toLocaleString()
            ] })
          ] }),
          /* @__PURE__ */ jsxs21("div", { className: "flex items-center gap-3", children: [
            defaults && /* @__PURE__ */ jsxs21(
              "button",
              {
                type: "submit",
                name: "action",
                value: "preview",
                className: "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900",
                children: [
                  /* @__PURE__ */ jsx30(Eye3, { size: 18 }),
                  " Preview"
                ]
              }
            ),
            /* @__PURE__ */ jsxs21("div", { className: "relative inline-flex rounded-lg shadow-sm", children: [
              /* @__PURE__ */ jsx30(
                "button",
                {
                  type: "submit",
                  name: "action",
                  value: saveAction,
                  disabled: loading,
                  className: "relative inline-flex items-center rounded-l-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:z-10 focus:outline-none disabled:opacity-50",
                  children: loading ? /* @__PURE__ */ jsxs21(Fragment5, { children: [
                    /* @__PURE__ */ jsx30(Loader22, { size: 16, className: "mr-2 animate-spin" }),
                    "Saving..."
                  ] }) : saveAction === "draft" ? "Save Draft" : saveAction === "published" ? "Publish" : "Submit"
                }
              ),
              /* @__PURE__ */ jsx30(
                "button",
                {
                  type: "button",
                  onClick: () => setSaveDrop(!saveDrop),
                  className: "relative -ml-px inline-flex items-center rounded-r-lg border-l border-blue-700 bg-blue-600 px-2 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:z-10 focus:outline-none",
                  children: /* @__PURE__ */ jsx30(
                    ChevronDown,
                    {
                      size: 16,
                      className: saveDrop ? "rotate-180 transition-transform" : "transition-transform"
                    }
                  )
                }
              ),
              saveDrop && /* @__PURE__ */ jsx30("div", { className: "ring-opacity-5 absolute top-full right-0 z-10 mt-1 w-32 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black", children: /* @__PURE__ */ jsxs21("div", { className: "py-1", children: [
                /* @__PURE__ */ jsx30(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setSaveAction(canPublish(user == null ? void 0 : user.role) ? "published" : "pending");
                      setSaveDrop(false);
                    },
                    className: "block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100",
                    children: canPublish(user == null ? void 0 : user.role) ? "Publish" : "Submit"
                  }
                ),
                /* @__PURE__ */ jsx30(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setSaveAction("draft");
                      setSaveDrop(false);
                    },
                    className: "block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100",
                    children: "Save Draft"
                  }
                )
              ] }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs21("div", { className: "flex flex-1 overflow-hidden", children: [
          /* @__PURE__ */ jsx30("div", { className: "flex-1 overflow-y-auto scroll-smooth bg-white", children: /* @__PURE__ */ jsxs21("div", { className: "mx-auto w-full max-w-[840px] px-8 py-12 lg:px-12", children: [
            /* @__PURE__ */ jsx30(
              "textarea",
              {
                name: "title",
                placeholder: "Add title",
                className: "w-full resize-none border-none bg-transparent p-0 font-serif text-5xl leading-tight font-bold text-gray-900 placeholder-gray-300 focus:border-none focus:ring-0 focus:outline-none",
                value: title,
                onChange: (e) => {
                  setTitle(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                },
                rows: 1,
                style: { overflow: "hidden" },
                required: true
              }
            ),
            /* @__PURE__ */ jsx30("div", { className: "mt-8 min-h-[400px]", children: /* @__PURE__ */ jsx30(BlockNote_default, { ref: rteRef, initialHTML: defaults == null ? void 0 : defaults.content }) })
          ] }) }),
          /* @__PURE__ */ jsxs21("div", { className: "flex w-[350px] shrink-0 flex-col border-l border-gray-200 bg-white", children: [
            /* @__PURE__ */ jsx30("div", { className: "flex shrink-0 border-b border-gray-200 px-2 pt-2", children: ["Post", "Meta", "SEO"].map((tab, index) => /* @__PURE__ */ jsx30(
              "button",
              {
                type: "button",
                onClick: () => setActiveTab(index),
                className: `flex-1 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === index ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`,
                children: tab
              },
              index
            )) }),
            /* @__PURE__ */ jsxs21("div", { className: "flex-1 overflow-y-auto", children: [
              activeTab === 0 && /* @__PURE__ */ jsxs21("div", { className: "flex flex-col divide-y divide-gray-100", children: [
                /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-4 p-4", children: [
                  /* @__PURE__ */ jsx30("h3", { className: "text-xs font-semibold tracking-wider text-gray-900 uppercase", children: "Status & Visibility" }),
                  /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-1", children: [
                    /* @__PURE__ */ jsx30("label", { className: "text-sm font-medium text-gray-700" }),
                    /* @__PURE__ */ jsx30(DateTime, { name: "published_at", defaultValue: defaults == null ? void 0 : defaults.published_at })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-4 p-4", children: [
                  /* @__PURE__ */ jsx30("h3", { className: "text-xs font-semibold tracking-wider text-gray-900 uppercase", children: "Featured Image" }),
                  /* @__PURE__ */ jsx30("div", { className: "group relative cursor-pointer rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50", children: /* @__PURE__ */ jsx30(
                    ImageUploader,
                    {
                      name: "cover",
                      defaultCover: coverPreview,
                      setCoverImage: (media) => {
                        if (media == null ? void 0 : media.url) setCoverPreview(media.url);
                        else setCoverPreview(null);
                      }
                    }
                  ) })
                ] }),
                /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-4 p-4", children: [
                  /* @__PURE__ */ jsx30("h3", { className: "text-xs font-semibold tracking-wider text-gray-900 uppercase", children: "Excerpt" }),
                  /* @__PURE__ */ jsx30(
                    Textarea,
                    {
                      name: "excerpt",
                      placeholder: "Write an excerpt (optional)",
                      value: excerpt,
                      onChange: (e) => setExcerpt(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-4 p-4", children: [
                  /* @__PURE__ */ jsx30("h3", { className: "text-xs font-semibold tracking-wider text-gray-900 uppercase", children: "Article Settings" }),
                  /* @__PURE__ */ jsx30(
                    ImageUploader,
                    {
                      name: "thumbnail",
                      defaultCover: thumbnailPreview,
                      caption: "Thumbnail",
                      id: "thumb-image-input",
                      setCoverImage: (media) => {
                        if (media == null ? void 0 : media.id) {
                          setThumbnailId(media.id);
                          setThumbnailPreview(media.url);
                        } else {
                          setThumbnailId(null);
                          setThumbnailPreview(null);
                        }
                      }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx30(InputFields, { fields: ["redirect_url"] })
              ] }),
              activeTab === 1 && /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-6 p-4", children: [
                /* @__PURE__ */ jsx30("h3", { className: "text-xs font-semibold tracking-wider text-gray-900 uppercase", children: "Meta Data" }),
                /* @__PURE__ */ jsx30(InputFields, { fields: ["meta_title", "canonical_url", "meta_description:text"] })
              ] }),
              activeTab === 2 && /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-6 p-4", children: [
                /* @__PURE__ */ jsx30("h3", { className: "text-xs font-semibold tracking-wider text-gray-900 uppercase", children: "SEO Data" }),
                /* @__PURE__ */ jsx30(InputFields, { fields: ["og_title"] }),
                /* @__PURE__ */ jsx30(
                  Textarea,
                  {
                    name: "og_description",
                    placeholder: "OG Description",
                    value: ogDescription,
                    onChange: (e) => setOgDescription(e.target.value)
                  }
                ),
                /* @__PURE__ */ jsxs21("div", { className: "flex flex-col gap-2", children: [
                  /* @__PURE__ */ jsx30("label", { className: "text-sm font-medium text-gray-700", children: "OG Image" }),
                  /* @__PURE__ */ jsx30("div", { className: "group relative cursor-pointer rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50", children: /* @__PURE__ */ jsx30(
                    ImageUploader,
                    {
                      name: "og_image_url",
                      id: "og-image-uploader",
                      defaultCover: ogPreview,
                      caption: "OG Image",
                      setCoverImage: (media) => {
                        if (media == null ? void 0 : media.url) setOgPreview(media.url);
                        else setOgPreview(null);
                      }
                    }
                  ) })
                ] }),
                /* @__PURE__ */ jsx30(SchemaEditor, { schema: schema2 })
              ] })
            ] })
          ] })
        ] })
      ]
    },
    (defaults == null ? void 0 : defaults.id) ?? `new-${formKey}`
  ) });
}

// src/components/atoms/TagInput.jsx
import { useId, useRef as useRef9, useState as useState19 } from "react";
import { X as X4 } from "lucide-react";
import { jsx as jsx31, jsxs as jsxs22 } from "react/jsx-runtime";
function TagInput({
  value = [],
  onChange,
  name,
  suggestions = [],
  placeholder = "Add a tag and press enter",
  maxTags
}) {
  const [inputValue, setInputValue] = useState19("");
  const [activeIndex, setActiveIndex] = useState19(-1);
  const inputRef = useRef9(null);
  const listId = useId();
  const atLimit = typeof maxTags === "number" && value.length >= maxTags;
  const filteredSuggestions = inputValue.trim() ? suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.trim().toLowerCase()) && !value.some((t) => t.toLowerCase() === s.toLowerCase())
  ) : [];
  function commitTag(raw) {
    const tag = raw.trim();
    if (!tag || atLimit) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setInputValue("");
      return;
    }
    onChange == null ? void 0 : onChange([...value, tag]);
    setInputValue("");
    setActiveIndex(-1);
  }
  function removeTag(index) {
    var _a;
    onChange == null ? void 0 : onChange(value.filter((_, i) => i !== index));
    (_a = inputRef.current) == null ? void 0 : _a.focus();
  }
  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (activeIndex >= 0 && filteredSuggestions[activeIndex]) {
        commitTag(filteredSuggestions[activeIndex]);
      } else {
        commitTag(inputValue);
      }
      return;
    }
    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value.length - 1);
      return;
    }
    if (e.key === "ArrowDown" && filteredSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filteredSuggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && filteredSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => i <= 0 ? filteredSuggestions.length - 1 : i - 1);
      return;
    }
    if (e.key === "Escape") {
      setActiveIndex(-1);
    }
  }
  return /* @__PURE__ */ jsxs22("div", { className: "tag-input gap-xs flex-1 flex-col", children: [
    name && /* @__PURE__ */ jsx31("input", { type: "hidden", name, value: value.join(","), readOnly: true }),
    /* @__PURE__ */ jsxs22("div", { className: "tag-input__field", onClick: () => {
      var _a;
      return (_a = inputRef.current) == null ? void 0 : _a.focus();
    }, children: [
      value.map((tag, i) => /* @__PURE__ */ jsxs22("span", { className: "tag-input__tag", children: [
        tag,
        /* @__PURE__ */ jsx31(
          "button",
          {
            type: "button",
            className: "tag-input__remove",
            "aria-label": `Remove ${tag}`,
            onClick: (e) => {
              e.stopPropagation();
              removeTag(i);
            },
            children: /* @__PURE__ */ jsx31(X4, { size: 12, strokeWidth: 2.5 })
          }
        )
      ] }, `${tag}-${i}`)),
      /* @__PURE__ */ jsx31(
        "input",
        {
          ref: inputRef,
          type: "text",
          className: "tag-input__input",
          value: inputValue,
          onChange: (e) => {
            setInputValue(e.target.value);
            setActiveIndex(-1);
          },
          onKeyDown: handleKeyDown,
          onBlur: () => commitTag(inputValue),
          placeholder: atLimit ? "" : placeholder,
          disabled: atLimit,
          role: "combobox",
          "aria-expanded": filteredSuggestions.length > 0,
          "aria-controls": listId,
          autoComplete: "off"
        }
      )
    ] }),
    filteredSuggestions.length > 0 && /* @__PURE__ */ jsx31("ul", { className: "tag-input__suggestions", id: listId, role: "listbox", children: filteredSuggestions.map((s, i) => /* @__PURE__ */ jsx31(
      "li",
      {
        role: "option",
        "aria-selected": i === activeIndex,
        className: "tag-input__suggestion" + (i === activeIndex ? " tag-input__suggestion--active" : ""),
        onMouseDown: (e) => {
          e.preventDefault();
          commitTag(s);
        },
        onMouseEnter: () => setActiveIndex(i),
        children: s
      },
      s
    )) }),
    typeof maxTags === "number" && /* @__PURE__ */ jsxs22("span", { className: "tag-input__count", children: [
      value.length,
      "/",
      maxTags
    ] })
  ] });
}
export {
  AdminChildrenLayout,
  AdminConfigInit,
  AdminGate,
  AdminLayout,
  AdminNav,
  Logo as AdminNavLogo,
  AdminProvider,
  AdminShell,
  BlockNote_default as ArticleEditor,
  AuthProvider,
  BackButton,
  Badge,
  BlueRedButton,
  Breadcrumb,
  Button,
  ButtonBlock,
  DataTable,
  DateTime,
  DefaultsContext,
  DeleteAction,
  DeleteButton,
  EditButton,
  EmbedBlock,
  Form,
  ImageUploader,
  Input,
  InputFields,
  LibraryImageBlock,
  LoginPage,
  MediaLibraryModal,
  NumberSelector,
  PayloadEntityForm,
  PayloadField,
  PostForm,
  RateDisplay,
  RateInput,
  RelationshipField,
  ResetButton,
  SchemaEditor,
  Select,
  TagInput,
  Textarea,
  ViewButton,
  allowed,
  cn,
  defineEntities,
  defineEntity,
  getRuntimeConfig,
  isUuid,
  removeEmptyFields,
  resolveUrl,
  setRuntimeConfig,
  useApi,
  useAuth,
  useEntity,
  useFetchEntity,
  useGet,
  useToast
};
