// blocks/ButtonBlock.jsx
"use no memo";
"use client";

import { useRef, useState } from "react";

import { createReactBlockSpec } from "@blocknote/react";

export const ButtonBlock = createReactBlockSpec(
  {
    type: "button",
    propSchema: {
      text: { default: "Click me" },
      url: { default: "" },
      variant: { default: "primary" }, // primary | secondary | outline
    },
    content: "none",
  },
  {
    // How it looks INSIDE the editor while editing
    render: (props) => {
      const { text, url, variant } = props.block.props;
      const containerRef = useRef(null);
      const [focused, setFocused] = useState(false);

      const handleFocus = () => setFocused(true);

      const handleBlur = (e) => {
        // Only hide the overlay once focus actually leaves this block —
        // tabbing/clicking between the text input, url input, and select
        // (all inside containerRef) should keep it open.
        if (!containerRef.current?.contains(e.relatedTarget)) {
          setFocused(false);
        }
      };

      return (
        <div
          ref={containerRef}
          className="cta-editor-block"
          style={{ position: "relative", display: "inline-block" }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          contentEditable={false}
        >
          <input
            className={`cta-button cta-button--${variant}`}
            value={text}
            placeholder="Button text"
            onChange={(e) =>
              props.editor.updateBlock(props.block, {
                props: { text: e.target.value },
              })
            }
          />

          {focused && (
            <div
              className="cta-editor-overlay"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "6px",
                display: "flex",
                gap: "8px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                padding: "8px",
                zIndex: 1000,
              }}
            >
              <input
                className="cta-editor-block__url"
                value={url}
                placeholder="https://..."
                onChange={(e) =>
                  props.editor.updateBlock(props.block, {
                    props: { url: e.target.value },
                  })
                }
              />
              <select
                className="cta-editor-block__variant"
                value={variant}
                onChange={(e) =>
                  props.editor.updateBlock(props.block, {
                    props: { variant: e.target.value },
                  })
                }
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </div>
          )}
        </div>
      );
    },
    // What actually gets saved as HTML for the public site
    toExternalHTML: (props) => {
      const { text, url, variant } = props.block.props;
      return (
        <a href={url} className={`cta-button cta-button--${variant}`}>
          {text}
        </a>
      );
    },
  },
);
