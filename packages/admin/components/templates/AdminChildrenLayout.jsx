// components/admin/AdminChildrenLayout.jsx
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import DataTable from "./DataTable.jsx";
import { FilterSelect } from "../atoms/FilterSelect.jsx";
import { useFetchEntity } from "../../hooks/useFetchEntity.js";
import { capitalise } from "../../utils/utils.js";
import { getEntities } from "../../lib/runtime.config.js";

const EntityContext = createContext({});
export const useEntity = () => useContext(EntityContext);

export function AdminChildrenLayout({ name, tablefields, actions }) {
  // 1. Get the filter config from the entity definition
  const entities = getEntities();
  const entityConfig = entities[name];
  const filterConfig = entityConfig?.filters || [];

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filters state (an object like: { role: "admin" })
  const [activeFilters, setActiveFilters] = useState({});

  // Debounce effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Build query params
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", limit);

  if (debouncedSearch) {
    // Note: If you want to search a field other than 'name' dynamically,
    // you could read entityConfig.titleField here.
    params.set("search", debouncedSearch);
  }

  // Apply active filters to the query params
  Object.entries(activeFilters).forEach(([field, value]) => {
    if (value) {
      params.set(`${field}`, value);
    }
  });

  const entity = useFetchEntity(name, params);

  const value = {
    name: name,
    ...entity,
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  const handleFilterChange = (field, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1); // Reset to page 1 when a filter changes
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setPage(1);
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const totalCount = entity?.data?.total ?? entity?.data?.totalDocs;

  return (
    <EntityContext value={value}>
      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
        {/* Header card */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">{capitalise(name)}</h2>
            {typeof totalCount === "number" && (
              <p className="text-sm text-gray-500">{totalCount} total</p>
            )}
          </div>
          <Link
            href={`/admin/${name}/new`}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:px-4"
          >
            <Plus size={16} />
            <span className="max-w-[9rem] truncate sm:max-w-none">
              {entityConfig?.addLabel ?? `New ${capitalise(name)}`}
            </span>
          </Link>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          {/* Search + filters: 2-column grid on mobile, inline row on sm+ */}
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
            {/* Search */}
            <div className="relative col-span-2 sm:col-auto">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${name}...`}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-base text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:w-64 sm:py-1.5 sm:text-sm"
              />
            </div>

            {/* Dynamic filters mapped from entities config */}
            {filterConfig.map((filter) => (
              <FilterSelect
                key={filter.field}
                label={filter.label}
                options={filter.options}
                value={activeFilters[filter.field] || ""}
                onChange={(v) => handleFilterChange(filter.field, v)}
                className="w-full sm:w-auto sm:min-w-[10rem]"
              />
            ))}

            {/* Clear filters button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="col-span-2 flex items-center gap-1 py-1 text-sm text-gray-500 hover:text-gray-900 sm:col-auto sm:py-0"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>

          {/* Limit selector */}
          <div className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-start">
            <label htmlFor="limit-select" className="whitespace-nowrap text-sm text-gray-600">
              <span className="sm:hidden">Per page:</span>
              <span className="hidden sm:inline">Items per page:</span>
            </label>
            <select
              id="limit-select"
              value={limit}
              onChange={handleLimitChange}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-base font-medium text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:py-1.5 sm:text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* DataTable handles its own responsive layout (cards on mobile) */}
        <DataTable
          data={entity.data}
          loading={Boolean(entity.isLoading)}
          fields={tablefields}
          editHref={entityConfig?.editHref ?? `/admin/${name}/`}
          rowHref={entityConfig?.rowHref}
          actions={actions}
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </div>
    </EntityContext>
  );
}
