"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FileText, FileVideo, ImageIcon, Loader2, Search, Upload, X } from "lucide-react";

import { useApi, useGet } from "../../contexts/ApiContext.jsx";
import { getMediaRoute } from "../../lib/runtime.config.js";
import { resolveUrl } from "../../utils/utils.js";
import { Input, Select } from "../atoms/Input.jsx";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;
const TYPE_OPTIONS = ["pdf", "docx", "image", "video"];

// Falls back to guessing from the file extension if the item has no `type` field
function getFileKind(item) {
  if (item.type) return item.type;
  const source = item.filename || item.url || "";
  const ext = source.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
  return "file";
}

// Same idea, but for a raw browser File object (from the upload picker)
function getFileKindFromFile(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  ) {
    return "docx";
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
  return "file";
}

function FilePreview({ label, kind }) {
  const iconMap = {
    pdf: <FileText size={32} className="text-red-500" />,
    docx: <FileText size={32} className="text-blue-500" />,
    video: <FileVideo size={32} className="text-purple-500" />,
    file: <FileText size={32} className="text-gray-400" />,
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gray-50 p-2 text-center">
      {iconMap[kind] ?? iconMap.file}
      <span className="w-full truncate text-[11px] leading-tight font-medium text-gray-600" title={label}>
        {label}
      </span>
      {kind !== "file" && (
        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-gray-500 uppercase">
          {kind}
        </span>
      )}
    </div>
  );
}

export function MediaLibraryModal({ onClose, onSelect, name }) {
  const [activeTab, setActiveTab] = useState("browse");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const debounceRef = useRef(null);

  // Debounce the search input before it hits the request URL
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 whenever the search term changes
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value);
    setPage(1); // reset to page 1 whenever the type filter changes
  };

  const mediaPath = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    return `${getMediaRoute()}?${params.toString()}`;
  }, [debouncedSearch, typeFilter, page]);

  const { data, isLoading, mutate } = useGet(mediaPath);
  const { post, del } = useApi();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // { name, kind, objectUrl }

  const fileInputRef = useRef(null);
  const uploadFieldsRef = useRef(null);

  const items = data?.items ?? [];

  useEffect(() => {
    if (selectedFile?.objectUrl) {
      const url = selectedFile.objectUrl;
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    setSelectedFile((prev) => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      if (!file) return null;

      const kind = getFileKindFromFile(file);
      const objectUrl = kind === "image" || kind === "video" ? URL.createObjectURL(file) : null;

      return { name: file.name, kind, objectUrl };
    });
  };

  const resetUploadTab = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    const altEl = uploadFieldsRef.current?.querySelector('input[name="alt"]');
    const titleEl = uploadFieldsRef.current?.querySelector('input[name="title"]');
    if (altEl) altEl.value = "";
    if (titleEl) titleEl.value = "";
    setSelectedFile((prev) => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("media", file);
    const alt = uploadFieldsRef.current?.querySelector('input[name="alt"]')?.value;
    const title = uploadFieldsRef.current?.querySelector('input[name="title"]')?.value;
    const caption = uploadFieldsRef.current?.querySelector('input[name="caption"]')?.value;
    const type = uploadFieldsRef.current?.querySelector('select[name="type"]')?.value;

    if (alt) formData.append("alt", alt);
    if (title) formData.append("title", title);
    if (caption) formData.append("caption", caption);
    if (type) formData.append("type", type);

    const created = await post("/media", formData);
    setUploading(false);
    if (created) {
      resetUploadTab();
      mutate();
      setActiveTab("browse");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this image from the media library?")) return;
    setDeletingId(id);
    await del(`/media/${id}`);
    setDeletingId(null);
    mutate();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[720px] flex-col gap-4 overflow-auto rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-lg font-semibold text-gray-900">Media Library</h3>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-300" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "browse"}
            className={`inline-flex translate-y-px items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === "browse"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("browse")}
          >
            <ImageIcon size={15} />
            <span>Browse</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "upload"}
            className={`inline-flex translate-y-px items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload size={15} />
            <span>Upload</span>
          </button>
        </div>

        {activeTab === "browse" ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-gray-300 px-2.5 py-1.5">
                <Search size={15} className="shrink-0 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search media..."
                  className="w-full border-0 text-sm outline-none placeholder:text-gray-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    title="Clear search"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={typeFilter}
                onChange={handleTypeFilterChange}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 outline-none"
              >
                <option value="">All types</option>
                {TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading media…</span>
              </div>
            ) : items.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500">
                {search || typeFilter ? "No media matches your filters." : "No images uploaded yet."}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5 overflow-y-scroll">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 overflow-y-auto p-0.5">
                  {items
                    .filter((item) => item.url)
                    .map((item) => {
                      const kind = getFileKind(item);
                      return (
                        <div
                          key={item.id}
                          className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-gray-300 transition-all hover:-translate-y-px hover:border-blue-600"
                          onClick={() => onSelect(item)}
                          title={item.filename}
                        >
                          {kind === "image" ? (
                            <Image
                              src={resolveUrl(item)}
                              alt={item.alt || item.filename || "media item"}
                              className="h-full w-full bg-gray-100 object-cover"
                              fill
                            />
                          ) : (
                            <FilePreview label={item.title || item.filename || "Untitled"} kind={kind} />
                          )}
                          <button
                            type="button"
                            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-100"
                            onClick={(e) => handleDelete(e, item.id)}
                            title="Delete image"
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <X size={14} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>

                {data?.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {data.page ?? page} of {data.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                      disabled={page >= data.totalPages}
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={`flex flex-col gap-2 ${uploading ? "opacity-70" : ""}`}>
            <label
              className={`relative flex h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 ${
                uploading ? "cursor-default opacity-70" : ""
              } ${selectedFile ? "border-solid p-0" : ""}`}
            >
              {uploading ? (
                <>
                  <Loader2 size={28} className="animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : selectedFile ? (
                <>
                  {selectedFile.kind === "image" && (
                    <img
                      src={selectedFile.objectUrl}
                      alt="Selected file preview"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  )}
                  {selectedFile.kind === "video" && (
                    <video
                      src={selectedFile.objectUrl}
                      className="absolute inset-0 h-full w-full object-contain"
                      muted
                      controls
                    />
                  )}
                  {(selectedFile.kind === "pdf" ||
                    selectedFile.kind === "docx" ||
                    selectedFile.kind === "file") && (
                    <div className="absolute inset-0">
                      <FilePreview label={selectedFile.name} kind={selectedFile.kind} />
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    onClick={(e) => {
                      e.preventDefault();
                      resetUploadTab();
                    }}
                    title="Remove selected file"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={28} />
                  <span>Click to choose a file</span>
                  <span className="text-xs text-gray-500">Images, PDF, DOCX, or video up to 10MB</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                hidden
                disabled={uploading}
              />
            </label>

            <div ref={uploadFieldsRef} className="flex flex-col gap-2">
              <Input name="alt" placeholder="Alt text" disabled={uploading} />
              <Input name="title" placeholder="Title" disabled={uploading} />
              <Input name="caption" placeholder="Caption" disabled={uploading} />
              <Select name="type" placeholder="Type" disabled={uploading}>
                {TYPE_OPTIONS.map((value, index) => (
                  <option key={index} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
