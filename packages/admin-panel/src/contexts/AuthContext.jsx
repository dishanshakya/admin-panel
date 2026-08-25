"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi, useGet } from "./ApiContext.jsx";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const { data, isLoading } = useGet("/auth/me");
  const { post } = useApi();
  const router = useRouter();

  useEffect(() => {
    if (!data) return;
    if (!data.success) {
      setUser(null);
      router.push("/login");
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
