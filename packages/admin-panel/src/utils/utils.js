import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getHost } from "../lib/runtime.config.js";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function resolveUrl(media) {
  const host = getHost();
  return media.url?.startsWith("http") ? media.url : `${host}${media.url}`;
}

export function repeat(n, item) {
  const temp = [];
  for (let i = 0; i < n; i++) temp.push(item);
  return temp;
}

export function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export function capitalise(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isEmpty(value) {
  if (value === null || value === undefined) return true;

  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;

  return false;
}

export function localDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

export function arrayfinder(obj) {
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val)) return val;
  }
  return [];
}

export function generatePostLink(lang, type, slug) {
  const routePath = `/${lang}/${type}/${slug}`;
  return routePath ?? "#";
}

export function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
  return slug;
}
