"use client";

import { useEffect, useState } from "react";

import { fetcher, resolveUrl } from "../../utils/utils.js";
import { useResolvedDefault } from "../atoms/Input.jsx";
import { MediaLibraryModal } from "../organisms/MediaLibraryModal.jsx";

export function ImageUploader({
  name,
  altname,
  titlename,
  setCoverImage = () => {},
  removeCoverImage = null,
  id = "cover-image-input",
  caption = "Cover Image",
  defaultCover = null,
  fit = "cover", // "cover" | "contain"
  mode = "media", // "media" | "url" — controls the shape defaultCover/setCoverImage use
  ...rest
}) {
  const isUrlMode = mode === "url";

  const normalizedDefaultCover = isUrlMode
    ? defaultCover
      ? { url: defaultCover }
      : null
    : defaultCover;

  const [coverPreview, setCoverPreview] = useState(normalizedDefaultCover);
  const [selectedMediaId, setSelectedMediaId] = useState(
    isUrlMode ? null : (normalizedDefaultCover?.id ?? null)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const defaultProps = useResolvedDefault(name, rest);
  const defValue = defaultProps?.defaultValue;

  useEffect(() => {
    if (isUrlMode) return; // url mode has no media id to resolve — defaultCover is already the final value
    if (!defValue) return;
    fetcher(`/media/${defValue}`).then((res) => {
      setCoverPreview(res.item);
      setSelectedMediaId(defValue);
    });
  }, [defValue, isUrlMode]);

  const handleSelectMedia = (media) => {
    setCoverPreview(media);
    if (!isUrlMode) {
      setSelectedMediaId(media.id);
      setAlt(media.alt);
      setTitle(media.title);
    }
    setCoverImage(isUrlMode ? media.url : media); // url mode: parent gets a plain string back
    setModalOpen(false);
  };

  const handleRemoveImage = () => {
    if (removeCoverImage) {
      removeCoverImage();
      return;
    }
    setCoverImage(isUrlMode ? "" : null);
    setCoverPreview(null);
    if (!isUrlMode) setSelectedMediaId(null);
  };

  const fitClass = fit === "contain" ? "object-contain" : "object-cover";

  // In media mode, coverPreview may be a bare media object that resolveUrl knows
  // how to turn into a backend-hosted URL. In url mode, coverPreview.url is
  // already the final, directly-usable src (a frontend /public path or a full
  // external URL) and must NOT be passed through resolveUrl, which would
  // wrongly prefix it with the backend's API base URL.
  const previewSrc = coverPreview ? (isUrlMode ? coverPreview.url : resolveUrl(coverPreview)) : null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{caption}</label>

      {coverPreview ? (
        <div className="group relative h-40 w-full overflow-hidden rounded-lg border border-gray-200">
          <img
            src={previewSrc}
            alt="Cover preview"
            className={`block h-full w-full ${fitClass}`}
            onClick={() => setModalOpen(true)}
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/55 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600/85"
            title="Remove image"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-5 text-gray-400 transition-colors hover:border-indigo-500 hover:text-indigo-500"
          onClick={() => setModalOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-sm font-medium">Click to choose from media library</span>
          <span className="text-xs text-gray-300">PNG, JPG, WEBP up to 10MB</span>
        </button>
      )}

      {!isUrlMode && selectedMediaId && (
        <input type="hidden" name={name} id={id} value={selectedMediaId} readOnly />
      )}

      {modalOpen && (
        <MediaLibraryModal
          onClose={() => setModalOpen(false)}
          onSelect={handleSelectMedia}
          name={name}
        />
      )}
    </div>
  );
}

