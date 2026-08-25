// components/blocks/LibraryImageBlock.jsx
"use client";

import { useState } from "react";

import { defaultProps } from "@blocknote/core";
import {
  ResizableFileBlockWrapper,
  createReactBlockSpec,
} from "@blocknote/react";
import { ImageIcon } from "lucide-react";

import { MediaLibraryModal } from "./MediaLibraryModal";
import { resolveUrl } from "../../utils/utils.js";

/**
 * Replaces BlockNote's built-in "image" block. Instead of the native
 * file-upload panel, clicking the block (empty or already-filled) opens
 * the shared MediaLibraryModal so every image in the editor comes from,
 * and is manageable through, the media library.
 */
export const LibraryImageBlock = createReactBlockSpec(
  {
    type: "image",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      backgroundColor: defaultProps.backgroundColor,
      url: { default: "" },
      name: { default: "" },
      caption: { default: "" },
      // Required by ResizableFileBlockWrapper to support drag-to-resize.
      showPreview: { default: true },
      previewWidth: { default: undefined, type: "number" },
    },
    content: "none",
  },
  {
    // BlockNote's convention for file-type blocks (image/video/audio/file):
    // declare accepted mime types and use a File/ResizableFileBlockWrapper
    // in the render — this is what wires up resizing.
    meta: { fileBlockAccept: ["image/*"] },
    render: (props) => {
      const { block, editor } = props;
      // Freshly inserted blocks have no url yet — open the picker
      // immediately instead of waiting for a click on the placeholder.
      // Blocks loaded from existing content already have a url, so this
      // only fires once, right after insertion.
      const [modalOpen, setModalOpen] = useState(() => !block.props.url);

      const handleSelect = (media) => {
        editor.updateBlock(block, {
          props: {
            url: resolveUrl(media),
            name: media.filename || "",
          },
        });
        setModalOpen(false);
      };

      const handleClose = () => {
        // Closed without picking anything — if the block is still empty,
        // drop it instead of leaving a dead placeholder in the document.
        if (!block.props.url) {
          editor.removeBlocks([block.id]);
          return;
        }
        setModalOpen(false);
      };

      return (
        <>
          {block.props.url ? (
            // Wrapping only the filled state gives us the native
            // drag-to-resize handles without reintroducing the native
            // "click to upload" empty-state button — the empty branch
            // below stays fully our own (library-only) UI.
            <ResizableFileBlockWrapper
              {...props}
              buttonIcon={<ImageIcon size={20} />}
            >
              <img
                src={block.props.url}
                alt={block.props.name || "image"}
                title="Click to replace image"
                className="library-image-block-img"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </ResizableFileBlockWrapper>
          ) : (
            <div
              className="library-image-placeholder"
              contentEditable={false}
              onClick={() => setModalOpen(true)}
            >
              <ImageIcon size={22} />
              <span>Choose image from library</span>
            </div>
          )}

          {modalOpen && (
            <MediaLibraryModal
              onClose={handleClose}
              onSelect={handleSelect}
              name="articleImage"
            />
          )}
        </>
      );
    },
    // Used by editor.blocksToHTMLLossy() / blocksToFullHTML() when
    // serializing to static HTML (your getHtml() in BlockNote.jsx).
    // Without this, BlockNote falls back to statically rendering the
    // *editor* React tree above — which now includes the resize wrapper,
    // handles, and click-to-replace wiring, not a clean <img>. This keeps
    // exported/published HTML to a plain image tag.
    // Recognizes existing <img> tags (and the div.image-container wrapper
    // your getHtml() export produces) when loading initialHTML via
    // tryParseHTMLToBlocks. Without this, incoming images are silently
    // dropped since the custom block has no built-in HTML match rule.
    parse: (element) => {
      let img = null;

      if (element.tagName === "IMG") {
        img = element;
      } else if (
        element.tagName === "DIV" &&
        element.classList?.contains("image-container")
      ) {
        img = element.querySelector("img");
      }

      if (!img) {
        return undefined;
      }

      return {
        url: img.getAttribute("src") || "",
        name: img.getAttribute("alt") || "",
      };
    },
    toExternalHTML: (props) => {
      const { block } = props;
      if (!block.props.url) {
        return <p />;
      }
      return (
        <img
          src={block.props.url}
          alt={block.props.name || ""}
          style={
            block.props.previewWidth
              ? { width: `${block.props.previewWidth}px` }
              : undefined
          }
        />
      );
    },
  },
);
