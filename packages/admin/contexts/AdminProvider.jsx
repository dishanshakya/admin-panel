"use client";
import { ApiProvider } from "./ApiContext.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { AdminGate } from "../components/templates/AdminGate.jsx";
import { ToastProvider } from "./ToastContext.jsx"
import { AdminShell } from "../components/templates/AdminShell.jsx";
import { getRuntimeConfig } from "../lib/runtime.config.js";
import { LoadingProvider } from './LoadingContext.jsx';


export function AdminProvider({ children }) {
  const config = getRuntimeConfig();

  if (!config?.apiBaseUrl) {
    throw new Error(
      "[@lynx/admin-panel] Missing config. Make sure <AdminConfigInit config={adminConfig} /> " +
      "is mounted in your root layout before any admin routes render."
    );
  }

  return (
    <ToastProvider>
      <ApiProvider baseUrl={config.apiBaseUrl} >
        <LoadingProvider trackFetch colorClass='bg-primary-green text-primary-green'>
          <AuthProvider>
              <AdminGate>
                <AdminShell>{children}</AdminShell>
              </AdminGate>
          </AuthProvider>
        </LoadingProvider>
      </ApiProvider>
    </ToastProvider>
  );
}
