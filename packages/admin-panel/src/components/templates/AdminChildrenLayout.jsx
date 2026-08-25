
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import DataTable from "./DataTable.jsx";
import { useFetchEntity } from "../../hooks/useFetchEntity.js";
import { capitalise } from "../../utils/utils.js";
import { getEntities } from "../../lib/runtime.config.js";
const EntityContext = createContext({});
export const useEntity = () => useContext(EntityContext);

export function AdminChildrenLayout({
  name,
  tablefields,
  actions,
}) {
  // 1. Get the filter config from the entity definition
  const entities = getEntities()
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
    params.set("where[name][like]", debouncedSearch);
  }

  // Apply active filters to the query params
  Object.entries(activeFilters).forEach(([field, value]) => {
    if (value) {
      params.set(`where[${field}][equals]`, value);
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

  return (
    <EntityContext value={value}>
      <div className="flex flex-col gap-5">

        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{capitalise(name)}</h2>
            {typeof entity?.data?.totalDocs === "number" && (
              <p className="text-sm text-gray-500">{entity.data.totalDocs} total</p>
            )}
          </div>
          <Link
            href={`/admin/${name}/new`}
            className="flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <Plus size={16} />
            New {capitalise(name)}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left side: Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${name}...`}
                className="w-full sm:w-64 rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {/* Dynamic Filters mapped from entities config */}
            {filterConfig.map((filter) => (
              <select
                key={filter.field}
                value={activeFilters[filter.field] || ""}
                onChange={(e) => handleFilterChange(filter.field, e.target.value)}
                className="rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="">All {filter.label}</option>
                {filter.options.map((opt) => {
                  const val = typeof opt === "string" ? opt : opt.value;
                  const label = typeof opt === "string" ? opt : opt.label;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ))}

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>

          {/* Right side: Limit Selector */}
          <div className="flex items-center gap-2 ml-auto">
            <label htmlFor="limit-select" className="text-sm text-gray-600 whitespace-nowrap">
              Items per page:
            </label>
            <select
              id="limit-select"
              value={limit}
              onChange={handleLimitChange}
              className="rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <DataTable
          data={entity.data}
          fields={tablefields}
          editHref={`/admin/${name}/`}
          actions={actions}
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </div>
    </EntityContext>
  );
}
