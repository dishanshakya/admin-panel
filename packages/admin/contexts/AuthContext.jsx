"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi, useGet } from "./ApiContext.jsx";
import { getRuntimeConfig } from "../lib/runtime.config.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  console.log('heres')
  const [user, setUser] = useState(null);
  const { data, isLoading, mutate } = useGet("/auth/me");
  const { post } = useApi();
  const router = useRouter();

  async function refresher(url) {
    const { apiBaseUrl } = getRuntimeConfig()
    const res = await fetch(apiBaseUrl + url, {
      credentials: 'include',
      method: 'POST'
    })
    return res

  }

  useEffect(() => {
    if (!data) return;
    if (!data.success) {
        setUser(null);
        router.replace("/admin/login");
        return;
    }
    setUser(data?.user);
  }, [data]);

  const logout = async () => {
    const res = await post("/auth/logout");
    if (res?.success) {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
