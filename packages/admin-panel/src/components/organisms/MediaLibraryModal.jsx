"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useApi, useGet } from "../../contexts/ApiContext.jsx";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";

import { Input } from "../atoms/Input.jsx";

// adjust import path as needed

// adjust import path to wherever ApiProvider actually lives

import {  getMediaRoute } from "../../lib/runtime.config.js";
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
  const uploadFieldsRef = useRef(null); // wraps the Input fieldsets, queried by name on submit

  const items = Object.fromEntries(
    Object.entries(data ?? {}).filter(([, val]) => Array.isArray(val)),
  );

  // Revoke the object URL whenever it's replaced or the component unmounts
  useEffect(() => {
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
    const alt = uploadFieldsRef.current?.querySelector('input[name="alt_text"]')?.value;
    const title = uploadFieldsRef.current?.querySelector('input[name="title"]')?.value;
    if (alt) formData.append("alt_text", alt);
    if (title) formData.append("title", title);
    formData.append("type", "image");

    const created = await post("/media", formData); // toasts + loading handled by ApiProvider
    setUploading(false);
    if (created) {
      resetUploadTab();
      mutate(); // refresh the list from the server
      setActiveTab("browse");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this image from the media library?")) return;
    setDeletingId(id);
    await del(`/media/${id}`); // toasts + loading handled by ApiProvider
    setDeletingId(null);
    mutate();
  };

  return (
    <div className="media-library-overlay" onClick={onClose}>
      <div className="media-library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="media-library-header">
          <h3>Media Library</h3>
          <button type="button" className="media-library-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="media-library-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "browse"}
            className={`media-library-tab${activeTab === "browse" ? "media-library-tab--active" : ""}`}
            onClick={() => setActiveTab("browse")}
          >
            <ImageIcon size={15} />
            <span>Browse</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "upload"}
            className={`media-library-tab${activeTab === "upload" ? "media-library-tab--active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload size={15} />
            <span>Upload</span>
          </button>
        </div>

        {activeTab === "browse" ? (
          isLoading ? (
            <div className="media-library-loading">
              <Loader2 size={20} className="media-library-spin" />
              <span>Loading media…</span>
            </div>
          ) : Object.keys(items).length === 0 ? (
            <p className="media-library-empty">No images uploaded yet.</p>
          ) : (
            <div className="media-library-categories">
              {Object.entries(items).map(([key, val]) => (
                <div key={key} className="media-library-category-section">
                  <h4 className="media-library-category-heading">{formatCategoryLabel(key)}</h4>
                  {!val || val.length === 0 ? (
                    <p className="media-library-empty">No images in this category yet.</p>
                  ) : (
                    <div className="media-library-grid">
                      {val
                        .filter((item) => item.url)
                        .map((item, n) => (
                          <div
                            key={`${key}-${n}`}
                            className="media-library-item"
                            onClick={() => onSelect(item)}
                            title={item.filename}
                          >
                            <Image
                              src={resolveUrl(item.url)}
                              alt={item.alt || item.filename || "media item"}
                              className="media-library-item-img"
                              fill
                            />
                            <button
                              type="button"
                              className="media-library-item-delete-btn"
                              onClick={(e) => handleDelete(e, item.id)}
                              title="Delete image"
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? (
                                <Loader2 size={14} className="media-library-spin" />
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
          <div
            className={`gap-sm flex-col media-library-upload-form${uploading ? "media-library-upload-form--busy" : ""}`}
          >
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
                  {/* Plain <img> for a blob: object URL — next/image can't optimize it */}
                  <img
                    src={previewUrl}
                    alt="Selected file preview"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    onClick={(e) => {
                      e.preventDefault(); // don't reopen the file picker
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

            <div ref={uploadFieldsRef}>
              <Input name="alt_text" placeholder="Alt text" disabled={uploading} />
              <Input name="title" placeholder="Title" disabled={uploading} />
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
