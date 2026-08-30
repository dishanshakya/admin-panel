// components/admin/DataTable.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Badge } from "../atoms/Badge.jsx";
import { EditButton, ViewButton } from "../atoms/Buttons.jsx";
import { DeleteAction } from "../organisms/DeleteAction.jsx";
import { useEntity } from "./AdminChildrenLayout.jsx";
import { resolveUrl } from "../../utils/utils.js";

function normalizePayloadResponse(data) {
  if (Array.isArray(data)) {
    return { docs: data, totalDocs: data.length, page: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  }
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    hasNextPage: (data?.page < data?.totalPages) || false,
    hasPrevPage: (data?.page > 1) || false,
  };
}

// Payload relationship/upload fields come back either as a raw id string
// (depth: 0) or a populated object (depth >= 1). Handle both without erroring.
function resolveRelationValue(value, labelKey = "name") {
  if (value == null) return null;
  if (typeof value === "string") return { id: value, label: value }; // unpopulated — just the id
  return { id: value.id, label: value[labelKey] ?? value.filename ?? value.id };
}

export default function DataTable({
  data,
  fields,
  editHref,
  actions,
  onPageChange, // optional: (nextPage: number) => void
  selectable = true, // set false to hide the checkbox column entirely
}) {
  const { name, mutate } = useEntity();
  const { items, total, page, totalPages, hasNextPage, hasPrevPage } = normalizePayloadResponse(data);
  console.log('data',normalizePayloadResponse(data))
  console.log('fields', fields)

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const headerCheckboxRef = useRef(null);

  // Selection is scoped to what's currently on screen — clear it whenever
  // the page's data changes (new page, refetch after delete, etc).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  const selectedCount = selectedIds.size;
  const allOnPageSelected = items.length > 0 && selectedCount === items.length;
  const someOnPageSelected = selectedCount > 0 && !allOnPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someOnPageSelected;
    }
  }, [someOnPageSelected]);

  const toggleAll = () => {
    setSelectedIds(allOnPageSelected ? new Set() : new Set(items.map((item) => item.id)));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedCount} selected ${selectedCount === 1 ? "record" : "records"}? This can't be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          fetch(`/${name}/${id}`, { method: "DELETE" })
        )
      );
      const failed = results.filter((r) => r.status === "rejected" || r.value?.ok === false);
      if (failed.length > 0) {
        console.error(`${failed.length} of ${selectedCount} deletes failed`);
      }
      await mutate();
      setSelectedIds(new Set());
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCell = (item, field) => {
    console.log('field key', field)
    const [key, type, ...rest] = field.key.split(":");
    const value = item[key];

    switch (type) {
      case "image":
        return (
          <div className="h-9 w-9 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
            <img
              src={resolveUrl(value)}
              alt={field.head}
              className="h-full w-full object-cover"
            />
          </div>
        );

      case "upload": {
        const media = typeof value === "object" && value !== null ? value : null;
        const src = media?.url
          ? resolveUrl(media.url)
          : null;
        if (!src) {
          return (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 ring-1 ring-gray-200">
              —
            </div>
          );
        }
        return (
          <div className="h-9 w-9 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
            <img src={src} alt={media?.alt ?? field.head} className="h-full w-full object-cover" />
          </div>
        );
      }

      case "relationship": {
        const labelKey = rest[0] ?? "name";
        const resolved = resolveRelationValue(value, labelKey);
        return resolved ? (
          <span className="text-sm text-gray-700">{resolved.label}</span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        );
      }

      case "date":
        if (!value) return <span className="text-sm text-gray-400">—</span>;
        return (
          <span className="text-sm text-gray-600">
            {new Date(value).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        );

      case "bold":
        return <span className="text-sm font-semibold text-gray-900">{value}</span>;

      case "status":
        return (
          <Badge
            value={value}
            variant={value === "published" ? "success" : "default"}
          />
        );

      default:
        return (
          <span className="text-sm text-gray-600" title={value}>
            {value}
          </span>
        );
    }
  };

  const defaultActions = (item) => (
    <>
      {editHref && (
        <Link
          href={typeof editHref === "function" ? editHref(item) : editHref + item.id}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <EditButton />
        </Link>
      )}
      <DeleteAction route={`/${name}/${item.id}`} mutate={mutate} />
    </>
  );

  const renderActions = actions ?? defaultActions;

  return (
    <div className="flex flex-col gap-3">
      {selectable && selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{selectedCount}</span>{" "}
            {selectedCount === 1 ? "record" : "records"} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={14} />
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {selectable && (
                  <th className="w-10 ">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      disabled={items.length === 0}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900"
                      aria-label="Select all rows on this page"
                    />
                  </th>
                )}
                {fields.map((field, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap  text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {field.head}
                  </th>
                ))}
                {renderActions && (
                  <th className="whitespace-nowrap  text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id ?? index}
                    className={`transition-colors hover:bg-gray-50 ${isSelected ? "bg-gray-50" : ""}`}
                  >
                    {selectable && (
                      <td className=" align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900"
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {fields.map((field, i) => (
                      <td key={i} className="whitespace-nowrap px-4 py-3 align-middle">
                        {renderCell(item, field)}
                      </td>
                    ))}
                    {renderActions && (
                      <td className=" align-middle">
                        <div className="flex items-center justify-end gap-1">{renderActions(item)}</div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={(selectable ? 1 : 0) + fields.length + (renderActions ? 1 : 0)}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page <span className="font-medium text-gray-700">{page}</span> of{" "}
            <span className="font-medium text-gray-700">{totalPages}</span>{" "}
            <span className="text-gray-400">({total} total)</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrevPage}
              onClick={() => onPageChange(page - 1)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNextPage}
              onClick={() => onPageChange(page + 1)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
