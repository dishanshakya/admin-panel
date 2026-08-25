// blocks/EmbedBlock.jsx
"use no memo";
"use client";

import { useState } from "react";

import { createReactBlockSpec } from "@blocknote/react";

// YouTube (and most providers) hand out a full <iframe ...></iframe>
// snippet under "Share > Embed" rather than a bare URL. Detect that case
// and pull just the src out, so pasting the whole snippet works too.
function extractUrl(value) {
  const trimmed = value.trim();
  if (!/^<iframe[\s>]/i.test(trimmed) || typeof window === "undefined") {
    return trimmed;
  }
  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  const iframe = doc.querySelector("iframe");
  return iframe?.getAttribute("src")?.trim() || trimmed;
}

export const EmbedBlock = createReactBlockSpec(
  {
    type: "embed",
    propSchema: {
      url: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { block, editor } = props;
      // No url yet (freshly inserted) → start in editing mode so the
      // input is focused immediately, same pattern as the image block.
      const [editing, setEditing] = useState(!block.props.url);
      const [inputValue, setInputValue] = useState(block.props.url || "");

      const commitUrl = () => {
        const trimmed = inputValue.trim();
        if (trimmed) {
          editor.updateBlock(block, { props: { url: extractUrl(trimmed) } });
          setEditing(false);
          return;
        }
        // Left empty — if the block never had a url, drop it instead of
        // leaving a dead empty embed block behind.
        if (!block.props.url) {
          editor.removeBlocks([block.id]);
        } else {
          setEditing(false);
        }
      };

      const handleKeyDown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitUrl();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setInputValue(block.props.url || "");
          if (!block.props.url) {
            editor.removeBlocks([block.id]);
          } else {
            setEditing(false);
          }
        }
      };

      if (editing) {
        return (
          <div className="w-full" contentEditable={false}>
            <input
              autoFocus
              className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-solid focus:border-blue-600 focus:bg-white"
              value={inputValue}
              placeholder="Paste a URL or an <iframe> embed code and press Enter…"
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitUrl}
            />
          </div>
        );
      }

      return (
        <div
          className="group relative w-full overflow-hidden rounded-lg"
          contentEditable={false}
        >
          <iframe
            src={block.props.url}
            className="block aspect-video w-full rounded-lg border-0 bg-black"
            loading="lazy"
            allowFullScreen
          />
          <button
            type="button"
            className="absolute right-2 top-2 rounded border border-white/40 bg-slate-900/65 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-slate-900/85 group-hover:opacity-100"
            onClick={() => {
              setInputValue(block.props.url);
              setEditing(true);
            }}
            title="Replace embed URL"
          >
            Replace
          </button>
        </div>
      );
    },
    // Recognizes <iframe> tags (bare, or wrapped in our exported
    // div.embed-container) when loading initialHTML.
    parse: (element) => {
      if (element.tagName === "IFRAME") {
        return { url: element.getAttribute("src") || "" };
      }
      if (
        element.tagName === "DIV" &&
        element.classList?.contains("embed-container")
      ) {
        const iframe = element.querySelector("iframe");
        if (iframe) {
          return { url: iframe.getAttribute("src") || "" };
        }
      }
      return undefined;
    },
    // Clean static markup for the published site.
    toExternalHTML: (props) => {
      const { url } = props.block.props;
      if (!url) {
        return <p />;
      }
      return (
        <div className="embed-container relative aspect-video w-full overflow-hidden rounded-lg [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0">
          <iframe src={url} loading="lazy" allowFullScreen />
        </div>
      );
    },
  },
);
