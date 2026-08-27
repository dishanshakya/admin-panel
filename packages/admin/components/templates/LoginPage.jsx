"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form } from "../molecules/Form.jsx";
import { Input } from "../atoms/Input.jsx";
import { getRuntimeConfig } from "../../lib/runtime.config.js";

export function LoginPage({ loginUrl='/auth/login', redirectTo = "/admin/dashboard" }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(values) {
    setError(null);
    setLoading(true);

    const { apiBaseUrl } = getRuntimeConfig();
    const res = await fetch(`${apiBaseUrl}${loginUrl}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data?.user) {
      setError(data?.errors?.[0]?.message ?? "Invalid email or password");
      return;
    }
    router.push(redirectTo);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-1/2 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">Log in</h1>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input name="email" type="email" placeholder="Email" required />
          <Input name="password" type="password" placeholder="Password" required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </Form>
      </div>
    </div>
  );
}
