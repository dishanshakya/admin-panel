"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * TagInput — free-entry tag editor for article forms.
 *
 * Controlled: pass `value` (array of strings) + `onChange`.
 * Also renders a hidden comma-joined input under `name`, so it drops
 * straight into an uncontrolled form / buildFormData without extra wiring.
 *
 * Props:
 *  value        string[]                 current tags (controlled)
 *  onChange     (tags: string[]) => void  called with the new array
 *  name         string                    hidden input name for FormData
 *  suggestions  string[]                  existing tags to autocomplete against
 *  placeholder  string
 *  maxTags      number
 */
export function TagInput({
  value = [],
  onChange,
  name,
  suggestions = [],
  placeholder = "Add a tag and press enter",
  maxTags,
}) {
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listId = useId();

  const atLimit = typeof maxTags === "number" && value.length >= maxTags;

  const filteredSuggestions = inputValue.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(inputValue.trim().toLowerCase()) &&
          !value.some((t) => t.toLowerCase() === s.toLowerCase()),
      )
    : [];

  function commitTag(raw) {
    const tag = raw.trim();
    if (!tag || atLimit) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setInputValue("");
      return;
    }
    onChange?.([...value, tag]);
    setInputValue("");
    setActiveIndex(-1);
  }

  function removeTag(index) {
    onChange?.(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (activeIndex >= 0 && filteredSuggestions[activeIndex]) {
        commitTag(filteredSuggestions[activeIndex]);
      } else {
        commitTag(inputValue);
      }
      return;
    }
    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value.length - 1);
      return;
    }
    if (e.key === "ArrowDown" && filteredSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filteredSuggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && filteredSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filteredSuggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Escape") {
      setActiveIndex(-1);
    }
  }

  return (
    <div className="tag-input gap-xs flex-1 flex-col">
      {name && <input type="hidden" name={name} value={value.join(",")} readOnly />}

      <div className="tag-input__field" onClick={() => inputRef.current?.focus()}>
        {value.map((tag, i) => (
          <span className="tag-input__tag" key={`${tag}-${i}`}>
            {tag}
            <button
              type="button"
              className="tag-input__remove"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          className="tag-input__input"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => commitTag(inputValue)}
          placeholder={atLimit ? "" : placeholder}
          disabled={atLimit}
          role="combobox"
          aria-expanded={filteredSuggestions.length > 0}
          aria-controls={listId}
          autoComplete="off"
        />
      </div>

      {filteredSuggestions.length > 0 && (
        <ul className="tag-input__suggestions" id={listId} role="listbox">
          {filteredSuggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIndex}
              className={
                "tag-input__suggestion" +
                (i === activeIndex ? " tag-input__suggestion--active" : "")
              }
              onMouseDown={(e) => {
                e.preventDefault();
                commitTag(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {typeof maxTags === "number" && (
        <span className="tag-input__count">
          {value.length}/{maxTags}
        </span>
      )}
    </div>
  );
}
