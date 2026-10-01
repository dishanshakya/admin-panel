// components/templates/LoginPage.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Form } from "../molecules/Form.jsx";
import { Input } from "../atoms/Input.jsx";
import { getRuntimeConfig } from "../../lib/runtime.config.js";

const REQUEST_TIMEOUT_MS = 15000;

// Maps status codes / failure types to messages a user can act on
function messageForStatus(status, data) {
  const serverMessage = data?.errors?.[0]?.message ?? data?.message;
  if (status === 400 || status === 401 || status === 403) {
    return serverMessage ?? "Invalid email or password.";
  }
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status >= 500) return "The server ran into a problem. Please try again shortly.";
  return serverMessage ?? "Something went wrong. Please try again.";
}

export function LoginPage({ loginUrl = "/auth/login", redirectTo = "/admin/dashboard" }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(values) {
    if (loading) return; // block double submits
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const { apiBaseUrl } = getRuntimeConfig();
      const res = await fetch(`${apiBaseUrl}${loginUrl}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email?.trim(),
        }),
        signal: controller.signal,
      });

      // The body may be empty or not JSON (e.g. a proxy error page)
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.user) {
        setError(messageForStatus(res.status, data));
        setLoading(false);
        return;
      }

      // Keep the button disabled while the redirect happens
      router.push(redirectTo);
    } catch (err) {
      if (err?.name === "AbortError") {
        setError("The request timed out. Check your connection and try again.");
      } else {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
      setLoading(false);
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Log in</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your credentials to continue.</p>
        </div>

        <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
            disabled={loading}
          />

          {/* Password with a show/hide toggle */}
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={-1}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* aria-live so screen readers announce the error when it appears */}
          <div aria-live="polite">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Logging in…" : "Log in"}
          </button>
        </Form>
      </div>
    </div>
  );
}
