"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useApi, useGet } from "../../contexts/ApiContext.jsx";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";

import { Input } from "../atoms/Input.jsx";

import { getMediaRoute } from "../../lib/runtime.config.js";
import { resolveUrl } from "../../utils/utils.js";

function formatCategoryLabel(key) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function MediaLibraryModal({ onClose, onSelect, name }) {
  const [activeTab, setActiveTab] = useState("browse");
  const { data, isLoading, mutate } = useGet(getMediaRoute());
  const { post, del } = useApi();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileInputRef = useRef(null);
  const uploadFieldsRef = useRef(null);

  const items = {
    media: data?.items
  }

  console.log('media items', items)

  useEffect(() => {
    console.log('getting logged')
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const resetUploadTab = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    const altEl = uploadFieldsRef.current?.querySelector('input[name="alt"]');
    const titleEl = uploadFieldsRef.current?.querySelector('input[name="title"]');
    if (altEl) altEl.value = "";
    if (titleEl) titleEl.value = "";
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
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
    if (alt) formData.append("alt", alt);
    if (title) formData.append("title", title);
    if (caption) formData.append("caption", caption);
    formData.append("type", "image");

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
        className="flex w-full max-w-[720px] max-h-[85vh] flex-col gap-4 overflow-scroll rounded-xl bg-white p-5 shadow-2xl"
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
          isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading media…</span>
            </div>
          ) : Object.keys(items).length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500">
              No images uploaded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5 overflow-y-scroll">
              {Object.entries(items).map(([key, val]) => (
                <div key={key}>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">
                    {formatCategoryLabel(key)}
                  </h4>
                  {!val || val.length === 0 ? (
                    <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500">
                      No images in this category yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 overflow-y-auto p-0.5">
                      {val
                        .filter((item) => item.url)
                        .map((item, n) => (
                          <div
                            key={`${key}-${n}`}
                            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-gray-300 transition-all hover:-translate-y-px hover:border-blue-600"
                            onClick={() => onSelect(item)}
                            title={item.filename}
                          >
                            <Image
                              src={resolveUrl(item)}
                              alt={item.alt || item.filename || "media item"}
                              className="h-full w-full object-cover bg-gray-100"
                              fill
                            />
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
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className={`flex flex-col gap-2 ${uploading ? "opacity-70" : ""}`}>
            <label
              className={`relative flex h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 ${
                uploading ? "cursor-default opacity-70" : ""
              } ${previewUrl ? "border-solid p-0" : ""}`}
            >
              {uploading ? (
                <>
                  <Loader2 size={28} className="animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Selected file preview"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    onClick={(e) => {
                      e.preventDefault();
                      resetUploadTab();
                    }}
                    title="Remove selected image"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={28} />
                  <span>Click to choose an image</span>
                  <span className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                hidden
                disabled={uploading}
              />
            </label>

            <div ref={uploadFieldsRef} className="flex flex-col gap-2">
              <Input name="alt" placeholder="Alt text" disabled={uploading} />
              <Input name="title" placeholder="Title" disabled={uploading} />
              <Input name="caption" placeholder="Caption" disabled={uploading} />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading || !previewUrl}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
