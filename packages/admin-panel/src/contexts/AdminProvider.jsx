"use client";
import { ApiProvider } from "./ApiContext.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { AdminGate } from "../components/templates/AdminGate.jsx";
import { AdminShell } from "../components/templates/AdminShell.jsx";
import { getRuntimeConfig } from "../lib/runtime.config.js";

export function AdminProvider({ children }) {
  const config = getRuntimeConfig();

  if (!config?.apiBaseUrl) {
    throw new Error(
      "[@lynx/admin-panel] Missing config. Make sure <AdminConfigInit config={adminConfig} /> " +
      "is mounted in your root layout before any admin routes render."
    );
  }

  return (
    <ApiProvider baseUrl={config.apiBaseUrl} >
      <AuthProvider>
        <AdminGate>
          <AdminShell>{children}</AdminShell>
        </AdminGate>
      </AuthProvider>
    </ApiProvider>
  );
}
