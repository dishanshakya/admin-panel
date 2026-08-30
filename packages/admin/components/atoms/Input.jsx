"use client";

import { useContext, useRef } from "react";

import { DefaultsContext } from "../molecules/Form";

// Converts snake_case / camelCase / kebab-case names into readable labels
// e.g. "country_name" -> "Country Name", "firstName" -> "First Name"
function humanize(name = "") {
  return name
    .replace(/_/g, " ") // snake_case -> spaces
    .replace(/-/g, " ") // kebab-case -> spaces
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase -> spaces
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function useResolvedDefault(name, rest) {
  const contextDefaults = useContext(DefaultsContext);
  const isControlled = "value" in rest;
  const resolvedDefaultValue = "defaultValue" in rest ? rest.defaultValue : contextDefaults?.[name];

  return isControlled ? {} : { defaultValue: resolvedDefaultValue };
}

// Returns a click handler that focuses the fieldset's inner control only when
// the click landed on the fieldset/legend padding (not the control itself).
// Refs are read inside the handler, never during render.
function useFocusOnFieldsetClick(ref) {
  return (e) => {
    if (e.target !== ref.current) {
      ref.current?.focus();
    }
  };
}

export function Input({
  placeholder,
  hidden,
  required,
  className,
  inputClassName,
  name,
  style,
  ...rest
}) {
  const defaultProps = useResolvedDefault(name, rest);
  const resolvedPlaceholder = placeholder ?? humanize(name);
  const inputRef = useRef(null);

  return (
    <div
      className={`flex w-full flex-col gap-1.5 border-black ${className || ""}`}
      style={{ display: hidden ? "none" : "flex", ...style }}
    >
      {resolvedPlaceholder && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {resolvedPlaceholder}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        id={name}
        name={name}
        required={required}
        className={`w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${inputClassName || ""}`}
        {...defaultProps}
        {...rest}
      />
    </div>
  );
}

export function Select({ placeholder, children, className, name, required, ...rest }) {
  const defaultProps = useResolvedDefault(name, rest);
  const resolvedPlaceholder = placeholder ?? humanize(name);
  const selectRef = useRef(null);
  const hasDefault = defaultProps.defaultValue != null && defaultProps.defaultValue !== "";
  console.log('select defults', defaultProps)

  return (
    <div className={`flex w-full flex-col gap-1.5 ${className || ""}`}>
      {resolvedPlaceholder && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {resolvedPlaceholder}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <select
        ref={selectRef}
        key={defaultProps.defaultValue}
        id={name}
        name={name}
        className="w-full cursor-pointer appearance-none rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        {...defaultProps}
      >
        {!hasDefault && <option value="">Select...</option>}
        {children}
      </select>
    </div>
  );
}

export function Textarea({ placeholder, className, name, required, ...rest }) {
  const defaultProps = useResolvedDefault(name, rest);
  const resolvedPlaceholder = placeholder ?? humanize(name);
  const textareaRef = useRef(null);

  return (
    <div className={`flex w-full flex-col gap-1.5 ${className || ""}`}>
      {resolvedPlaceholder && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {resolvedPlaceholder}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        ref={textareaRef}
        id={name}
        name={name}
        className="min-h-[100px] w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        {...defaultProps}
        {...rest}
      />
    </div>
  );
}

export function NumberSelector({ name, range, numbers, ...rest }) {
  const values = numbers ?? buildRange(range);
  return (
    <Select name={name} {...rest}>
      {values.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  );
}

function buildRange([start = 0, end = 9, step = 1] = []) {
  const result = [];
  for (let n = start; n <= end; n += step) {
    result.push(n);
  }
  return result;
}

export function RateInput({
  required = false,
  placeholder,
  tag,
  name,
  value,
  onChange,
  type,
  style,
  inputClassname,
}) {
  return (
    <div className="custom-input flex-1 flex-col">
      <span
        className="font-semibold"
        style={{
          color: required ? "var(--secondary-1000)" : "black",
          marginBottom: "5px",
        }}
      >
        {tag + (required ? "*" : "")}
      </span>
      <input
        type={type}
        className={`rate-input ${inputClassname}`}
        style={style}
        placeholder={placeholder}
        name={name}
        min={1}
        required={required}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export function RateDisplay({ required = false, value, tag, style }) {
  return (
    <div className="flex-1 flex-col">
      <span
        className="font-source-serif"
        style={{
          color: required ? "var(--secondary-1000)" : "black",
          fontWeight: 300,
        }}
      >
        {tag + (required ? "*" : "")}
      </span>
      <div
        className="rate-input"
        style={{
          display: "flex",
          alignItems: "center",
          color: value ? "black" : "#bbb",
          ...style,
        }}
      >
        {value}
      </div>
    </div>
  );
}
