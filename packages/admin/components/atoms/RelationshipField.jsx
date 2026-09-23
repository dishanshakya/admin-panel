// src/components/atoms/RelationshipField.jsx
"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { useApi } from "../../contexts/ApiContext.jsx";
import { DefaultsContext } from "../molecules/Form.jsx";

function humanize(name = "") {
  return name
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function RelationshipField({ field }) {
  const {
    name: rawName,
    label,
    required,
    relationTo,
    labelField = "name",
    valueField = "id",
    excludeSelf = false,
    searchable = true,
    placeholder,
  } = field;

  const name = rawName?.split(":")?.[0];
  const contextDefaults = useContext(DefaultsContext);
  const { get } = useApi();
  const params = useParams();

  // Latest `get` in a ref so an unstable useApi identity can't retrigger the fetch effect.
  const getRef = useRef(get);
  getRef.current = get;

  const resolvedLabel = label ?? humanize(name);
  const resolvedPlaceholder = placeholder ?? `Select ${resolvedLabel.toLowerCase()}...`;

  // Defaults usually carry only the id; the label is resolved from the fetched options.
  const defaultValue = contextDefaults?.[name] ?? "";
  const defaultLabel =
    contextDefaults?.[`${name}Label`] ??
    contextDefaults?.[relationTo]?.[labelField] ??
    "";

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const touchedRef = useRef(false);

  // If defaults arrive after mount, sync them in (unless the user already chose something).
  useEffect(() => {
    if (touchedRef.current) return;
    setSelectedId(defaultValue);
    setSelectedLabel(defaultLabel);
  }, [defaultValue, defaultLabel]);

  // True when we have an id but no label to show yet.
  const needsLabel = Boolean(selectedId) && !selectedLabel;

  // Single options fetch: runs when the dropdown is open, OR once on mount
  // when we need options just to resolve the selected label.
  useEffect(() => {
    if (!open && !needsLabel) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const query = search
          ? `?query=${encodeURIComponent(search)}&pageSize=25`
          : "?pageSize=25";
        const res = await getRef.current(`/${relationTo}${query}`);
        const items = res?.data?.items ?? res?.items ?? [];

        const filtered =
          excludeSelf && params?.id
            ? items.filter((item) => item[valueField] !== params.id)
            : items;

        setOptions(filtered);
      } catch (err) {
        console.error(`Failed to fetch relation options for "${relationTo}"`, err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [open, needsLabel, search, relationTo, excludeSelf, params?.id, valueField]);

  // Resolve the selected label from whatever options were fetched.
  useEffect(() => {
    if (!needsLabel) return;
    const match = options.find((o) => String(o[valueField]) === String(selectedId));
    if (match) setSelectedLabel(String(match[labelField]));
  }, [options, needsLabel, selectedId, valueField, labelField]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(option) {
    touchedRef.current = true;
    setSelectedId(option[valueField]);
    setSelectedLabel(String(option[labelField]));
    setOpen(false);
    setSearch("");
  }

  function handleClear(e) {
    e.stopPropagation();
    touchedRef.current = true;
    setSelectedId("");
    setSelectedLabel("");
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const displayOptions = useMemo(() => {
    if (searchable) return options;
    if (!search) return options;
    return options.filter((o) =>
      String(o[labelField]).toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, searchable, labelField]);

  const triggerText = selectedLabel
    ? selectedLabel
    : needsLabel && loading
    ? "Loading…"
    : resolvedPlaceholder;

  return (
    <div className="flex w-full flex-col gap-1.5" ref={containerRef}>
      {resolvedLabel && (
        <label className="text-sm font-medium text-gray-700">
          {resolvedLabel}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <input type="hidden" name={name} value={selectedId || ""} required={required} readOnly />

      <div className="relative">
        <button
          type="button"
          onClick={handleOpen}
          className="flex w-full items-center justify-between rounded-sm border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        >
          <span className={selectedLabel ? "text-gray-900" : "text-gray-400"}>
            {triggerText}
          </span>
          <div className="flex items-center gap-1">
            {selectedId && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-sm border border-gray-200 bg-white shadow-lg">
            {searchable && (
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            )}

            <div className="max-h-56 overflow-y-auto py-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  Loading…
                </div>
              ) : displayOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">No results</div>
              ) : (
                displayOptions.map((option) => (
                  <button
                    key={option[valueField]}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      String(option[valueField]) === String(selectedId)
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-900"
                    }`}
                  >
                    {option[labelField]}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

