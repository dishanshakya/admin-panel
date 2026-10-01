// components/admin/FilterSelect.jsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function FilterSelect({ label, value, onChange, options = [], className = "" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(
    () => [
      { value: "", label: `All ${label}` },
      ...options.map((opt) =>
        typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value, label: opt.label }
      ),
    ],
    [label, options]
  );

  const selectedIndex = Math.max(0, items.findIndex((i) => i.value === value));
  const selected = items[selectedIndex];
  const hasValue = value !== "" && value != null;

  const openMenu = () => {
    // Desktop only: if the popover would run off the right edge, right-align it
    const rect = rootRef.current?.getBoundingClientRect();
    setAlignRight(Boolean(rect && rect.left + 224 > window.innerWidth));
    setActive(selectedIndex);
    setOpen(true);
  };
  const closeMenu = () => setOpen(false);

  const choose = (item) => {
    onChange(item.value);
    closeMenu();
  };

  // Close on outside click/tap
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) closeMenu();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted option in view
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      closeMenu();
    }
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white py-2 pl-3 pr-2.5 text-left text-sm font-medium transition-colors hover:border-gray-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-900 sm:py-1.5 ${
          open || hasValue ? "border-gray-900 text-gray-900" : "border-gray-300 text-gray-700"
        } ${open ? "ring-1 ring-gray-900" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {/* Dot marks an active filter on every screen size */}
          {hasValue && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />}

          <span className="truncate" title={hasValue ? `${label}: ${selected.label}` : selected.label}>
            {/* Label prefix only from sm up, where there is room for it */}
            {hasValue && (
              <span className="hidden font-normal text-gray-500 sm:inline">{label}: </span>
            )}
            {selected.label}
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Mobile overlay: tap to close */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Bottom sheet on mobile, anchored popover from sm */}
          <div
            className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl
              sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:z-30 sm:mt-1 sm:w-max sm:min-w-full sm:max-w-xs sm:rounded-md sm:border sm:pb-0 sm:shadow-lg ${
                alignRight ? "sm:right-0" : "sm:left-0"
              }`}
          >
            {/* Mobile sheet header */}
            <div className="flex items-center justify-between px-4 pb-1 pt-3 sm:hidden">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </span>
              <button
                type="button"
                onClick={closeMenu}
                className="py-1 text-sm font-medium text-gray-500"
              >
                Close
              </button>
            </div>

            {/* Desktop popover header */}
            <div className="hidden border-b border-gray-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 sm:block">
              {label}
            </div>

            <ul
              ref={listRef}
              role="listbox"
              aria-label={label}
              className="max-h-[50dvh] overflow-y-auto p-1 sm:max-h-64"
            >
              {items.map((item, i) => {
                const isSelected = item.value === (value ?? "");
                return (
                  <li
                    key={item.value === "" ? "__all" : item.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(item)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-sm sm:py-2 ${
                      i === active ? "bg-gray-100" : ""
                    } ${isSelected ? "font-medium text-gray-900" : "text-gray-700"}`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSelected && <Check size={14} className="shrink-0 text-gray-900" />}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

