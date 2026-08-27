"use client";
import { useEffect, useState } from "react";
import { MediaLibraryModal } from "../organisms/MediaLibraryModal.jsx";
import { resolveUrl } from "../../utils/utils.js";

export function ImageUploader({
  name,
  altname,
  titlename,
  setCoverImage = () => {},
  removeCoverImage = null,
  id = "cover-image-input",
  caption = "Cover Image",
  defaultCover = null,
}) {
  const [coverPreview, setCoverPreview] = useState(defaultCover);
  const [selectedMediaId, setSelectedMediaId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    setCoverPreview(defaultCover);
  }, [defaultCover]);

  const handleSelectMedia = (media) => {
    setCoverPreview(media.url);
    setSelectedMediaId(media.id);
    setAlt(media.alt_text);
    setTitle(media.title);
    setCoverImage(media); // now a media library reference ({ id, url, filename }), not a raw File
    setModalOpen(false);
  };

  const handleRemoveImage = () => {
    if (removeCoverImage) {
      removeCoverImage();
      return;
    }
    setCoverImage(null);
    setCoverPreview(null);
    setSelectedMediaId(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{caption}</label>

      {coverPreview ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={resolveUrl(coverPreview)}
            alt="Cover preview"
            className="block w-full h-full max-h-[280px] max-w-[300px] object-contain"
            onClick={() => setModalOpen(true)}
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/55 text-white text-xs cursor-pointer transition-colors hover:bg-red-600/85"
            title="Remove image"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-2 h-40 p-5 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-pointer transition-colors hover:border-indigo-500 hover:text-indigo-500"
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

      {/* Hidden field so the selected media id still submits with the form, if needed */}
      <input type="hidden" name={name} id={id} value={coverPreview ?? ""} readOnly />
      <input type="hidden" name={altname || `${name?.split("_")?.[0]}_alt`} value={alt} readOnly />
      <input
        type="hidden"
        name={titlename || `${name?.split("_")?.[0]}_title`}
        value={title}
        readOnly
      />

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
