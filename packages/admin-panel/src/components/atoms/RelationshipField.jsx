"use client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useGet } from "../../contexts/ApiContext.jsx"; // adjust path to your actual hook location
import { Select } from "./Input.jsx";
import { DefaultsContext } from "../molecules/Form.jsx";

function docLabel(doc) {
  return doc?.name ?? doc?.title ?? doc?.id;
}

// Relation values come back either as raw id strings (depth: 0) or
// populated objects (depth >= 1) — same ambiguity DataTable's
// resolveRelationValue handles. Normalize to a plain id.
function toId(value) {
  if (value == null) return null;
  return typeof value === "object" ? value.id : value;
}

// Normalizes a stored relation default (single id/object, or array of
// them) into an array of {id, label} pairs we can render immediately —
// even before the /api/{relationTo} list has finished loading.
function normalizeDefaultDocs(value) {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map((v) => (typeof v === "object" ? { id: v.id, label: docLabel(v) } : { id: v, label: null }))
    .filter((v) => v.id != null);
}

export function RelationshipField({ field }) {
  const { name, relationTo, label, required, hasMany } = field;
  const contextDefaults = useContext(DefaultsContext);
  const { data, loading } = useGet(`/api/${relationTo}?limit=200`);
  const options = data?.docs ?? [];

  if (hasMany) {
    return (
      <RelationshipMultiSelect
        name={name}
        label={label}
        required={required}
        loading={loading}
        options={options}
        defaultValue={contextDefaults?.[name]}
      />
    );
  }

  const [selected, setSelected] = useState(() => toId(contextDefaults?.[name]) ?? "");

  return (
    <Select
      name={name}
      placeholder={label}
      required={required}
      disabled={loading}
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
    >
      <option value="">Select…</option>
      {options.map((doc) => (
        <option key={doc.id} value={doc.id}>
          {docLabel(doc)}
        </option>
      ))}
    </Select>
  );
}

// Search-and-add multi-select: type to filter, click (or Enter) to add a
// chip, click the chip's × to remove it. Replaces the native <select multiple>
// pattern, which requires ctrl/cmd-click to pick more than one option — an
// interaction most people never discover on their own.
function RelationshipMultiSelect({ name, label, required, loading, options, defaultValue }) {
  const defaultDocs = useMemo(() => normalizeDefaultDocs(defaultValue), [defaultValue]);
  const [selectedIds, setSelectedIds] = useState(() => defaultDocs.map((d) => d.id));
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

	useEffect(() => {
		setSelectedIds(defaultDocs.map(d => d.id))
	}, [defaultDocs])

  // Look up a chip's label: prefer the fetched options list (fresh data),
  // fall back to whatever label the default value shipped with (covers the
  // case where the fetched list hasn't loaded yet, or doesn't include an
  // id outside its `limit=200` page).
  const labelForId = (id) => {
    const fromOptions = options.find((doc) => doc.id === id);
    if (fromOptions) return docLabel(fromOptions);
    const fromDefault = defaultDocs.find((d) => d.id === id);
    return fromDefault?.label ?? id;
  };

  const filteredOptions = useMemo(() => {
    const available = options.filter((doc) => !selectedIds.includes(doc.id));
    if (!query.trim()) return available;
    const q = query.trim().toLowerCase();
    return available.filter((doc) => docLabel(doc)?.toLowerCase().includes(q));
  }, [options, selectedIds, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQuery("");
    inputRef.current?.focus();
  };

  const removeId = (id) => {
    setSelectedIds((prev) => prev.filter((existing) => existing !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const doc = filteredOptions[highlightedIndex];
      if (doc) addId(doc.id);
    } else if (e.key === "Backspace" && query === "" && selectedIds.length > 0) {
      removeId(selectedIds[selectedIds.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="group relative rounded-lg border border-gray-200 px-3 pb-2.5 pt-3.5 transition-colors focus-within:border-gray-900 hover:border-gray-300 focus-within:hover:border-gray-900">
      <label
        htmlFor={name}
        className="absolute -top-2 left-2.5 bg-white px-1 text-xs font-medium leading-none text-gray-500 transition-colors group-focus-within:text-gray-900"
      >
        {label}
      </label>

      <div ref={containerRef} className="relative">
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 rounded-md bg-gray-100 py-1 pl-2 pr-1 text-xs font-medium text-gray-700"
            >
              {labelForId(id)}
              <button
                type="button"
                onClick={() => removeId(id)}
                className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
                aria-label={`Remove ${labelForId(id)}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            id={name}
            type="text"
            value={query}
            disabled={loading}
            placeholder={loading ? "Loading…" : selectedIds.length ? "" : "Search…"}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="min-w-[80px] flex-1 border-none bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
          />
        </div>

        {isOpen && !loading && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {options.length === 0 ? "No options available" : "No matches"}
              </div>
            ) : (
              filteredOptions.map((doc, i) => (
                <button
                  key={doc.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep input focused
                  onClick={() => addId(doc.id)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                    i === highlightedIndex ? "bg-gray-100 text-gray-900" : "text-gray-700"
                  }`}
                >
                  {docLabel(doc)}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={`${name}[]`} value={id} />
      ))}

      {/* Invisible native input gives us free HTML5 "required" validation
          (at least one selected) without fighting the custom widget above. */}
      {required && (
        <input
          type="text"
          required
          value={selectedIds.length ? "valid" : ""}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
