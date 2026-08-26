"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, RotateCw } from "lucide-react";

import { Input } from "../atoms/Input.jsx";

const LOCKED_KEYS = ["@context", "@graph"];

export function SchemaEditor({ schema, inputName = "schema" }) {
  const autoJsonString = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  const nextRowId = useRef(0);
  const [rows, setRows] = useState(() => schemaToRows(schema, nextRowId));
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [rowErrors, setRowErrors] = useState({}); // id -> error message
  const [copied, setCopied] = useState(false);

  function schemaToRows(obj, idRef) {
    return LOCKED_KEYS.filter((key) => obj[key] !== undefined).map((key) => {
      const value = obj[key];
      return {
        id: idRef.current++,
        key,
        value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      };
    });
  }
  useEffect(() => {
    if (isManualEdit) return;
    setRows((prevRows) => {
      const prevByKey = new Map(prevRows.map((r) => [r.key, r]));
      return LOCKED_KEYS.filter((key) => schema[key] !== undefined).map((key) => {
        const value = schema[key];
        const strValue = typeof value === "string" ? value : JSON.stringify(value, null, 2);
        const existing = prevByKey.get(key);
        return {
          id: existing ? existing.id : nextRowId.current++,
          key,
          value: strValue,
        };
      });
    });
  }, [schema, isManualEdit]);

  function updateRowValue(id, value) {
    setIsManualEdit(true);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)));

    const trimmed = value.trim();
    const row = rows.find((r) => r.id === id);
    const isGraphRow = row?.key === "@graph";

    if (isGraphRow) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) throw new Error("not an array");
        setRowErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (e) {
        setRowErrors((prev) => ({
          ...prev,
          [id]: "@graph must be a valid JSON array",
        }));
      }
    } else {
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function resetToAuto() {
    setIsManualEdit(false);
    setRows(schemaToRows(schema, nextRowId));
    setRowErrors({});
  }
  const builtSchema = useMemo(() => {
    const obj = {};
    for (const { key, value } of rows) {
      const trimmed = value.trim();
      if (key === "@graph") {
        try {
          obj[key] = JSON.parse(trimmed);
          continue;
        } catch (e) {
          // invalid — handled by rowErrors, fall through without setting
          continue;
        }
      }
      obj[key] = value; // @context stays a plain string
    }
    return obj;
  }, [rows]);

  const hasRowErrors = Object.keys(rowErrors).length > 0;
  const submittedJson = useMemo(
    () => (hasRowErrors ? autoJsonString : JSON.stringify(builtSchema, null, 2)),
    [hasRowErrors, autoJsonString, builtSchema],
  );

  async function handleCopy() {
    const scriptTag = `<script type="application/ld+json">\n${submittedJson}\n</script>`;
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Clipboard can fail without permissions (e.g. insecure context);
      // fail silently rather than throwing mid-edit.
    }
  }

  return (
    <div className="gap-xs flex-col" style={{ marginBlock: "1rem" }}>
      <div className="flex-between" style={{ alignItems: "center" }}>
        <strong>Schema markup</strong>
        <div className="gap-sm flex">
          {!hasRowErrors && (
            <button
              type="button"
              style={{ gap: "0.5rem" }}
              className="multi-entry__add flex-center"
              onClick={handleCopy}
              disabled={hasRowErrors}
              title={hasRowErrors ? "Fix invalid values before copying" : undefined}
            >
              <Copy size={18} />
              {copied ? "Copied" : "Copy schema"}
            </button>
          )}
          {isManualEdit && (
            <button
              type="button"
              style={{ gap: "0.5rem" }}
              className="multi-entry__add flex-center"
              onClick={resetToAuto}
            >
              <RotateCw size={18} />
              Reset to auto-generated
            </button>
          )}
        </div>
      </div>

      <div className="gap flex" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="gap-xs flex-col" style={{ flex: 1, minWidth: 320 }}>
          {rows.map((row) => (
            <div key={row.id} className="gap-xs flex-col">
              <label className="text-xs" style={{ fontWeight: 600, fontSize: 14 }}>
                {row.key}
              </label>
              {row.key === "@context" ? (
                <Input value={row.value} onChange={(e) => updateRowValue(row.id, e.target.value)} />
              ) : (
                <textarea
                  className="rounded-md p-2 text-xs leading-relaxed"
                  style={{
                    width: "100%",
                    minHeight: 360,
                    maxHeight: 520,
                    fontFamily: "monospace",
                    border: rowErrors[row.id] ? "1px solid #e24b4a" : "1px solid transparent",
                  }}
                  value={row.value}
                  onChange={(e) => updateRowValue(row.id, e.target.value)}
                  spellCheck={false}
                />
              )}
              {rowErrors[row.id] && (
                <span className="text-xs" style={{ color: "#e24b4a", fontSize: "0.8rem" }}>
                  *{rowErrors[row.id]}
                </span>
              )}
            </div>
          ))}
          <span className="tip">Tip: You can edit the JSON directly in here.</span>
          {isManualEdit && !hasRowErrors && (
            <span className="text-xs" style={{ color: "Orange" }}>
              Manual editing mode
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 320 }}>
          <label
            style={{
              fontWeight: 600,
              display: "block",
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Live preview
          </label>
          <pre
            className="overflow-auto rounded-md bg-gray-900 p-4 text-xs leading-relaxed text-gray-100"
            style={{
              minHeight: 360,
              maxHeight: 520,
              overflow: "auto",
              backgroundColor: "#f0f0f0",
              color: "#000",
              fontSize: 12,
              borderRadius: "10px",
              padding: "10px",
            }}
          >
            {`<script type="application/ld+json">\n${submittedJson}\n</script>`}
          </pre>
        </div>
      </div>

      <input type="hidden" name={inputName} value={submittedJson} readOnly />
    </div>
  );
}
