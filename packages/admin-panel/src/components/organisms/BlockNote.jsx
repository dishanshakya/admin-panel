"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";

import "@blocknote/mantine/style.css";

import { useApi } from "../../contexts/ApiContext.jsx";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
  useSelectedBlocks,
} from "@blocknote/react";
import { Frame, ImageIcon, Link2 } from "lucide-react";

import { ButtonBlock } from "./ButtonBlock.jsx";
import { EmbedBlock } from "./EmbedBlock.jsx";
import { LibraryImageBlock } from "./LibraryImageBlock.jsx";
import { getRuntimeConfig } from "../../lib/runtime.config.js";

// image is now backed entirely by the media library (see LibraryImageBlock),
// so the default upload-based image block is dropped from the schema.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    button: ButtonBlock(),
    image: LibraryImageBlock(),
    embed: EmbedBlock(),
  },
});

const SEO_REL_OPTIONS = ["nofollow", "noindex", "noimageindex", "noarchive", "nosnippet"];

// BlockNote's default toolbar buttons (FileCaptionButton, FileReplaceButton,
// and their download/delete counterparts) key off a block having a `url`
// prop rather than its actual type — which means they'd also show up for
// our custom "image", "button", and "embed" blocks (all have a `url` prop),
// even though none of them should offer a native replace/upload/download
// flow. Only show those buttons for the real default file-backed types.
const FILE_TOOLBAR_BLOCK_TYPES = ["video", "audio", "file"];

function ArticleFormattingToolbar({ editor }) {
  const selectedBlocks = useSelectedBlocks(editor);
  const blockType = selectedBlocks.length === 1 ? selectedBlocks[0].type : undefined;
  const allowFileButtons = FILE_TOOLBAR_BLOCK_TYPES.includes(blockType);

  const items = getFormattingToolbarItems().filter((item) => {
    const key = typeof item.key === "string" ? item.key.toLowerCase() : "";
    const isFileButton = key.includes("file");
    return allowFileButtons || !isFileButton;
  });

  return <FormattingToolbar>{items}</FormattingToolbar>;
}

const ArticleEditor = forwardRef(function ArticleEditor({ initialHTML }, ref) {
  const { post } = useApi();
  const [loaded, setLoaded] = useState(false);
  const [linkRels, setLinkRels] = useState({});
  const [activeLinkInfo, setActiveLinkInfo] = useState(null); // { href, rect }

  const editor = useCreateBlockNote({
    schema,
    // Still used by other upload-capable blocks (file/video/audio) if present.
    // No longer used by "image" — that block only inserts via the media library.
    uploadFile: async (file) => {
      const { host } = getRuntimeConfig();
      const formData = new FormData();
      formData.append("UploadFiles", file);
      const res = await post("/articles/image", formData);
      return `${host}/uploads/articles/images/${res.name}`;
    },
  });

  // Load existing HTML content (editing an existing post) into blocks
  useEffect(() => {
    async function loadContent() {
      if (initialHTML && typeof window !== "undefined") {
        // 1. Extract any existing SEO rel attributes before BlockNote strips them
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialHTML, "text/html");
        const extractedRels = {};

        doc.querySelectorAll("a[href]").forEach((a) => {
          const href = a.getAttribute("href");
          const rel = a.getAttribute("rel") || "";
          if (href && rel) {
            const rels = rel
              .toLowerCase()
              .split(/\s+/)
              .filter((r) => SEO_REL_OPTIONS.includes(r));
            if (rels.length) {
              extractedRels[href] = rels;
            }
          }
        });

        if (Object.keys(extractedRels).length) {
          setLinkRels(extractedRels);
        }

        // 2. Load HTML into BlockNote
        const blocks = await editor.tryParseHTMLToBlocks(initialHTML);
        editor.replaceBlocks(editor.document, blocks);
      }
      setLoaded(true);
    }
    loadContent();
  }, [initialHTML, editor]);

  // Handle hovering over links to show our custom menu
  const handleEditorMouseOver = (e) => {
    const a = e.target.closest("a[href]");
    if (a) {
      const href = a.getAttribute("href");
      const rect = a.getBoundingClientRect();
      setActiveLinkInfo({ href, rect });
    }
  };

  const handleEditorMouseOut = (e) => {
    const a = e.target.closest("a[href]");
    if (a) {
      const related = e.relatedTarget;
      // If we leave the link, and we are NOT entering the rel menu, hide the menu
      if (!related || !related.closest || !related.closest(".link-rel-menu")) {
        setActiveLinkInfo(null);
      }
    }
  };

  const toggleRel = (rel) => {
    if (!activeLinkInfo) return;
    setLinkRels((prev) => {
      const current = prev[activeLinkInfo.href] || [];
      const exists = current.includes(rel);
      const next = exists ? current.filter((r) => r !== rel) : [...current, rel];
      return { ...prev, [activeLinkInfo.href]: next };
    });
  };

  useImperativeHandle(ref, () => ({
    getHtml: async () => {
      let html = await editor.blocksToHTMLLossy(editor.document);

      if (typeof window !== "undefined") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Inject the custom SEO rel attributes back into the <a> tags
        if (Object.keys(linkRels).length > 0) {
          doc.querySelectorAll("a[href]").forEach((a) => {
            const href = a.getAttribute("href");
            const rels = linkRels[href];
            if (rels && rels.length > 0) {
              a.setAttribute("rel", rels.join(" "));
            }
          });
        }

        // Wrap every <img> in a div.image-container
        doc.querySelectorAll("img").forEach((img) => {
          if (img.parentElement?.classList.contains("image-container")) {
            return; // already wrapped, avoid double-wrapping
          }
          const wrapper = doc.createElement("div");
          wrapper.className = "image-container";
          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);
        });

        html = doc.body.innerHTML;
      }

      return html;
    },
    getBlocks: () => {
      return editor.document;
    },
    getLinkRels: () => {
      return linkRels;
    },
  }));

  if (!loaded) return <p>Loading editor...</p>;

  return (
    <div
      style={{ position: "relative" }}
      onMouseOver={handleEditorMouseOver}
      onMouseOut={handleEditorMouseOut}
    >
      <BlockNoteView editor={editor} slashMenu={false} formattingToolbar={false} theme="light">
        <FormattingToolbarController
          formattingToolbar={() => <ArticleFormattingToolbar editor={editor} />}
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                // The default "Image" item also opens BlockNote's native
                // file panel directly, bypassing our block's own render.
                // Drop it and insert the block ourselves instead, so only
                // LibraryImageBlock's placeholder/media-library flow runs.
                ...getDefaultReactSlashMenuItems(editor).filter((item) => item.title !== "Image"),
                {
                  title: "Image",
                  subtext: "Insert an image from the media library",
                  group: "custom",
                  icon: <ImageIcon size={18} />,
                  onItemClick: () =>
                    insertOrUpdateBlockForSlashMenu(editor, {
                      type: "image",
                    }),
                  aliases: ["image", "img", "picture", "photo", "media"],
                },
                {
                  title: "Button",
                  subtext: "Insert a call-to-action button",
                  group: "custom",
                  icon: <Link2 size={18} />,
                  onItemClick: () =>
                    insertOrUpdateBlockForSlashMenu(editor, {
                      type: "button",
                    }),
                  aliases: ["button", "cta", "link"],
                },
                {
                  title: "Embed",
                  subtext: "Embed content from a URL (iframe)",
                  group: "custom",
                  icon: <Frame size={18} />,
                  onItemClick: () =>
                    insertOrUpdateBlockForSlashMenu(editor, {
                      type: "embed",
                    }),
                  aliases: ["embed", "iframe", "url"],
                },
              ],
              query,
            )
          }
        />
      </BlockNoteView>

      {/* Floating SEO Rel Menu */}
      {activeLinkInfo && (
        <div
          className="link-rel-menu"
          style={{
            position: "fixed",
            top: activeLinkInfo.rect.bottom,
            left: activeLinkInfo.rect.left,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            padding: "8px",
            display: "flex",
            gap: "12px",
            zIndex: 1000,
          }}
          onMouseLeave={() => setActiveLinkInfo(null)}
        >
          {SEO_REL_OPTIONS.map((rel) => (
            <label
              key={rel}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={(linkRels[activeLinkInfo.href] || []).includes(rel)}
                onChange={() => toggleRel(rel)}
                onMouseDown={(e) => e.preventDefault()}
              />
              {rel}
            </label>
          ))}
        </div>
      )}
    </div>
  );
});

export default ArticleEditor;
