"use client";
import { useEffect } from "react";
import { setRuntimeConfig } from "../lib/runtime.config.js";

export function AdminConfigInit({ config }) {
  useEffect(() => {
    setRuntimeConfig(config);
  }, [config]);
  return null;
}
