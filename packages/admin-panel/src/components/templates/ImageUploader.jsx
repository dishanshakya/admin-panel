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
    console.log(media);
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
    <div className="cover-image-uploader">
      <label className="cover-image-label">{caption}</label>
      {coverPreview ? (
        <div className="cover-preview-wrapper">
          <img
            src={resolveUrl(coverPreview)}
            alt="Cover preview"
            className="cover-preview-img"
            style={{ objectFit: "contain" }}
            onClick={() => setModalOpen(true)}
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="cover-remove-btn"
            title="Remove image"
          >
            ✕
          </button>
        </div>
      ) : (
        <button type="button" className="cover-dropzone" onClick={() => setModalOpen(true)}>
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
          <span>Click to choose from media library</span>
          <span className="cover-dropzone-hint">PNG, JPG, WEBP up to 10MB</span>
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
