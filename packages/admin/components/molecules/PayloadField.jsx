// src/components/molecules/PayloadField.js
"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; // Import icons for the toggle
import { Input, Textarea, Select } from '../atoms/Input.jsx'
import { RelationshipField } from "../atoms/RelationshipField.jsx";

// Dedicated Password component to handle show/hide state
function PasswordInput({ name, placeholder, required }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <Input
        name={name}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        className="pr-10" // Ensure padding so text doesn't overlap the icon
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 focus:outline-none"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function PayloadField({ field }) {
  const { name, type, label, required, options } = field;

  if (type === "select") {
    return (
      <Select name={name} placeholder={label} required={required}>
        <option value="">Select...</option>
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
    return <Textarea name={name} placeholder={label} required={required} />;
  }

  if (type === "email") {
    return <Input name={name} type="email" placeholder={label} required={required} />;
  }

  if (type === "number") {
    return <Input name={name} type="number" placeholder={label} required={required} />;
  }

  // Updated Password field using the new PasswordInput wrapper
  if (type === "password") {
    return <PasswordInput name={name} placeholder={label} required={required} />;
  }

  if (type === "text") {
    return <Input name={name} type="text" placeholder={label} required={required} />;
  }

  if (type === "relationship") {
    return <RelationshipField field={field} />;
  }

  // relationship, richText, array, upload etc. — not handled generically, see below
  console.warn(`No renderer for field type "${type}" — field "${name}" skipped`);
  return null;
}
