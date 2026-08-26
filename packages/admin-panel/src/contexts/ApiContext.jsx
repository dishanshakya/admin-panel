"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getRuntimeConfig } from "../lib/runtime.config.js";

export function useHost() {
  return getRuntimeConfig().host;
}

const ApiContext = createContext(null);

export function useGet(path) {
  const { apiBaseUrl:BASE_URL } = getRuntimeConfig()
  const [data, setData] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLocalLoading(true);
    try {
      const res = await fetch(BASE_URL + path, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setData(data);
        throw new Error(data.message || `Request failed (${res.status})`);
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
    headers: {},
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

export function ApiProvider({ baseUrl, children }) {
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
    [router],
  );

  const post = useCallback(
    (path, body, options) => handle(() => request("POST", path, body, baseUrl), options),
    [handle],
  );
  const patch = useCallback(
    (path, body, options) => handle(() => request("PATCH", path, body, baseUrl), options),
    [handle],
  );
  const del = useCallback(
    (path, options) => handle(() => request("DELETE", path, undefined, baseUrl), options),
    [handle],
  );

  const value = useMemo(() => ({ post, patch, del }), [post, patch, del]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside <ApiProvider>");
  return ctx;
}
