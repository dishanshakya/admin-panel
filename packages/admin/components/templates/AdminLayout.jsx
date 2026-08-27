"use client";
export function AdminLayout({ title, formId, buttonLabel = "Save", children }) {
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur">
        <h1 className="truncate text-xl font-semibold text-gray-900">{title}</h1>
        {formId && (
          <button
            type="submit"
            form={formId}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            {buttonLabel}
          </button>
        )}
      </header>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
