// src/components/molecules/PayloadField.js
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; // Import icons for the toggle

import { Input, Select, Textarea } from "../atoms/Input.jsx";
import { RelationshipField } from "../atoms/RelationshipField.jsx";
import { ImageUploader } from "../templates/ImageUploader.jsx";
import { MediaListUploader } from "../templates/MediaListUploader.jsx";

// Dedicated Password component to handle show/hide state
function PasswordInput({ name, placeholder, required, disabled }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <Input
        name={name}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="pr-10" // Ensure padding so text doesn't overlap the icon
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-800 focus:outline-none"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function PayloadField({ field }) {
  let { name, type, label, required, options } = field;
  name = name?.split(":")?.[0];

  // Fields marked `editable: false` render as disabled inputs — visible on the
  // form but never submitted with the payload.
  const disabled = field.editable === false;

  if (type === "select") {
    return (
      <Select name={name} placeholder={label} required={required} disabled={disabled}>
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const optLabel = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {optLabel}
            </option>
          );
        })}
      </Select>
    );
  }

  if (type === "textarea") {
    return <Textarea name={name} placeholder={label} required={required} disabled={disabled} />;
  }

  if (type === "email") {
    return (
      <Input name={name} type="email" placeholder={label} required={required} disabled={disabled} />
    );
  }

  if (type === "number") {
    return (
      <Input
        name={name}
        type="number"
        placeholder={label}
        required={required}
        disabled={disabled}
      />
    );
  }

  if (type === "date") {
    return (
      <Input name={name} type="date" placeholder={label} required={required} disabled={disabled} />
    );
  }

  if (type === "time") {
    return (
      <Input name={name} type="time" placeholder={label} required={required} disabled={disabled} />
    );
  }

  // Updated Password field using the new PasswordInput wrapper
  if (type === "password") {
    return (
      <PasswordInput name={name} placeholder={label} required={required} disabled={disabled} />
    );
  }

  if (type === "text") {
    return (
      <Input name={name} type="text" placeholder={label} required={required} disabled={disabled} />
    );
  }

  if (type === "date-time") {
    return (
      <Input
        name={name}
        type="datetime-local"
        aria-label={label}
        required={required}
        disabled={disabled}
      />
    );
  }

  if (type === "relationship") {
    return <RelationshipField field={field} />;
  }

  if (type === "image") {
    return <ImageUploader name={name} id={label} caption={label} />;
  }

  if (type === "medialist") {
    return (
      <MediaListUploader
        name={name}
        caption={field.label}
        columns={field.columns}
        disabled={disabled}
      />
    );
  }

  // relationship, richText, array, upload etc. — not handled generically, see below
  console.warn(`No renderer for field type "${type}" — field "${name}" skipped`);
  return null;
}
