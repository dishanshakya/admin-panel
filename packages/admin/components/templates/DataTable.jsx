// components/admin/DataTable.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Spinner } from '../atoms/spinner';
import { DateCell } from '../atoms/DateCell.jsx';

import Badge from '../molecules/Badge';
import { ConfirmationDialog } from '../molecules/ConfirmationModal';

import { resolveUrl } from '../../utils/utils.js';
import { EditButton } from '../atoms/Buttons.jsx';
import { DeleteAction } from '../organisms/DeleteAction.jsx';
import { useEntity } from './AdminChildrenLayout.jsx';
import { useApi } from '../../contexts/ApiContext.jsx';

function normalizePayloadResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    hasNextPage: data?.page < data?.totalPages || false,
    hasPrevPage: data?.page > 1 || false,
  };
}

// Payload relationship/upload fields come back either as a raw id string
// (depth: 0) or a populated object (depth >= 1). Handle both without erroring.
function resolveRelationValue(value, labelKey = 'name') {
  if (value == null) return null;
  if (typeof value === 'string') return { id: value, label: value }; // unpopulated, just the id
  return { id: value.id, label: value[labelKey] ?? value.filename ?? value.id };
}

const checkboxClass =
  'h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900';
const pageBtnClass =
  'rounded-md border border-gray-200 bg-white px-3 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white sm:py-1.5';
const stop = (e) => e.stopPropagation();

export default function DataTable({
  data,
  fields,
  editHref,
  rowHref, // optional: (item) => string, makes rows/cards clickable
  loading = true,
  actions,
  onPageChange, // optional: (nextPage: number) => void
  selectable = true, // set false to hide the checkbox column entirely
  canEdit = true, // set false to hide the per-row edit action
  canDelete = true, // set false to hide the per-row + bulk delete actions
}) {
  const router = useRouter();
  const { name, mutate } = useEntity();
  const { del } = useApi();
  const { items, total, page, totalPages, hasNextPage, hasPrevPage } =
    normalizePayloadResponse(data);

  // Bulk selection (and the checkbox column) is pointless without delete.
  const selectionEnabled = selectable && canDelete;

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const headerCheckboxRef = useRef(null);
  const mobileCheckboxRef = useRef(null);

  // Selection is scoped to what's currently on screen. Clear it whenever
  // the page's data changes (new page, refetch after delete, etc).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  const selectedCount = selectedIds.size;
  const allOnPageSelected = items.length > 0 && selectedCount === items.length;
  const someOnPageSelected = selectedCount > 0 && !allOnPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current)
      headerCheckboxRef.current.indeterminate = someOnPageSelected;
    if (mobileCheckboxRef.current)
      mobileCheckboxRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  const toggleAll = () => {
    setSelectedIds(
      allOnPageSelected ? new Set() : new Set(items.map((item) => item.id)),
    );
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Opens the confirmation dialog instead of deleting immediately.
  const handleBulkDelete = () => {
    if (selectedCount === 0) return;
    setConfirmBulkDeleteOpen(true);
  };

  // Actual delete logic, runs only after the user confirms in the dialog.
  const performBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          del(`/${name}/${id}`, { method: 'DELETE' }),
        ),
      );
      const failed = results.filter(
        (r) => r.status === 'rejected' || r.value?.ok === false,
      );
      if (failed.length > 0) {
        console.error(`${failed.length} of ${selectedCount} deletes failed`);
      }
      await mutate();
      setSelectedIds(new Set());
    } finally {
      setIsDeleting(false);
      setConfirmBulkDeleteOpen(false);
    }
  };

  const renderCell = (item, field) => {
    const [key, type, ...rest] = field.key.split(':');
    const value = item[key];

    switch (type) {
      case 'image':
        return (
          <div className="h-9 w-9 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
            <img
              src={resolveUrl(value)}
              alt={field.head}
              className="h-full w-full object-cover"
            />
          </div>
        );

      case 'upload': {
        const media =
          typeof value === 'object' && value !== null ? value : null;
        const src = media?.url ? resolveUrl(media.url) : null;
        if (!src) {
          return (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 ring-1 ring-gray-200">
              —
            </div>
          );
        }
        return (
          <div className="h-9 w-9 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
            <img
              src={src}
              alt={media?.alt ?? field.head}
              className="h-full w-full object-cover"
            />
          </div>
        );
      }

      case 'relationship': {
        const labelKey = rest[0] ?? 'name';
        const resolved = resolveRelationValue(value, labelKey);
        return resolved ? (
          <span className="text-sm text-gray-700 md:text-base">
            {resolved.label}
          </span>
        ) : (
          <span className="text-sm text-gray-400 md:text-base">—</span>
        );
      }

      case 'date':
        return <DateCell value={value} />;

      case 'bold':
        return (
          <span className="text-sm font-semibold text-gray-900 md:text-base">
            {value}
          </span>
        );

      case 'status':
        return <Badge value={value} className="text-sm!" />;

      case 'textarea':
        return (
          <p
            className="w-full max-w-48 truncate text-sm text-gray-600 md:w-48"
            title={value}
          >
            {value}
          </p>
        );

      default:
        return (
          <span className="text-sm text-gray-600 md:text-base" title={value}>
            {value}
          </span>
        );
    }
  };

  const defaultActions = (item) => (
    <>
      {canEdit && editHref && (
        <Link
          href={
            typeof editHref === 'function' ? editHref(item) : editHref + item.id
          }
          title="Edit"
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <EditButton />
        </Link>
      )}
      {canDelete && (
        <DeleteAction route={`/${name}/${item.id}`} mutate={mutate} />
      )}
    </>
  );

  const renderActions = actions ?? defaultActions;

  // Shared row/card navigation behaviour
  const navProps = (item) => ({
    onClick: () => rowHref && router.push(rowHref(item)),
    onKeyDown: (event) => {
      if (rowHref && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        router.push(rowHref(item));
      }
    },
    tabIndex: rowHref ? 0 : undefined,
    role: rowHref ? 'link' : undefined,
  });

  const colSpan =
    (selectionEnabled ? 1 : 0) + fields.length + (renderActions ? 1 : 0);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Bulk action bar */}
      {selectionEnabled && selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
          <span className="text-sm text-gray-600 md:text-base">
            <span className="font-medium text-gray-900">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'record' : 'records'} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 md:text-base"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
            >
              <Trash2 size={14} />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Mobile: cards ---------- */}
      <div className="flex flex-col gap-2 md:hidden">
        {selectionEnabled && items.length > 0 && (
          <label className="flex items-center gap-2 px-1 text-sm text-gray-600">
            <input
              ref={mobileCheckboxRef}
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleAll}
              className={checkboxClass}
            />
            Select all on this page
          </label>
        )}

        {items.map((item, index) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id ?? index}
              {...navProps(item)}
              className={`rounded-xl border bg-white p-3 shadow-sm transition-colors ${
                isSelected ? 'border-gray-400 bg-gray-50' : 'border-gray-200'
              } ${rowHref ? 'cursor-pointer active:bg-gray-50' : ''}`}
            >
              {(selectionEnabled || renderActions) && (
                <div
                  className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2"
                  onClick={stop}
                  onKeyDown={stop}
                >
                  {selectionEnabled ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(item.id)}
                      className={checkboxClass}
                      aria-label="Select row"
                    />
                  ) : (
                    <span />
                  )}
                  {renderActions && (
                    <div className="flex items-center gap-1">
                      {renderActions(item)}
                    </div>
                  )}
                </div>
              )}

              <dl className="flex flex-col gap-2">
                {fields.map((field, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3"
                  >
                    <dt className="shrink-0 text-xs font-medium tracking-wide text-gray-500 uppercase">
                      {field.head}
                    </dt>
                    <dd className="flex min-w-0 justify-end text-right">
                      {renderCell(item, field)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-center rounded-xl border border-gray-200 bg-white px-4 py-12">
            <Spinner />
          </div>
        )}

        {items.length === 0 && !loading && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-400">
            No records found.
          </div>
        )}
      </div>

      {/* ---------- Desktop: table ---------- */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {selectionEnabled && (
                  <th className="w-10 px-4 py-3">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      disabled={items.length === 0}
                      className={checkboxClass}
                      aria-label="Select all rows on this page"
                    />
                  </th>
                )}
                {fields.map((field, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-sm font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase"
                  >
                    {field.head}
                  </th>
                ))}
                {renderActions && (
                  <th className="px-4 py-3 text-right text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase">
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
                    {...navProps(item)}
                    className={`transition-colors hover:bg-gray-50 ${
                      rowHref ? 'cursor-pointer' : ''
                    } ${isSelected ? 'bg-gray-50' : ''}`}
                  >
                    {selectionEnabled && (
                      <td className="px-4 py-3 align-middle" onClick={stop}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                          className={checkboxClass}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {fields.map((field, i) => (
                      <td
                        key={i}
                        className="px-4 py-3 align-middle whitespace-nowrap"
                      >
                        {renderCell(item, field)}
                      </td>
                    ))}
                    {renderActions && (
                      <td className="px-4 py-3 align-middle" onClick={stop}>
                        <div className="flex items-center justify-end gap-1">
                          {renderActions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {items.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-4 py-12 text-center text-base text-gray-400"
                  >
                    No records found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12">
                    <div className="flex justify-center">
                      <Spinner />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between md:text-base">
          <span className="text-center text-gray-500 sm:text-left">
            Page <span className="font-medium text-gray-700">{page}</span> of{' '}
            <span className="font-medium text-gray-700">{totalPages}</span>{' '}
            <span className="text-gray-400">({total} total)</span>
          </span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              disabled={!hasPrevPage}
              onClick={() => onPageChange(page - 1)}
              className={pageBtnClass}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNextPage}
              onClick={() => onPageChange(page + 1)}
              className={pageBtnClass}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmBulkDeleteOpen(false);
        }}
        title={`Delete ${selectedCount} ${selectedCount === 1 ? 'record' : 'records'}?`}
        description="This action can't be undone."
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        variant="destructive"
        onConfirm={performBulkDelete}
      />
    </div>
  );
}
