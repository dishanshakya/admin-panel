"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

export function DateTime({ defaultValue, name = "publishedAt", label = "Publish date" }) {
  const [publishedAt, setPublishedAt] = useState(defaultValue ? new Date(defaultValue) : null);

  return (
    <fieldset>
      {label && <legend>{label}</legend>}
      <DatePicker
        selected={publishedAt}
        onChange={setPublishedAt}
        showTimeSelect
        dateFormat="MMM d, yyyy h:mm aa"
        isClearable
        placeholderText="Select date and time"
      />
      <input type="hidden" name={name} value={publishedAt ? publishedAt.toISOString() : ""} />
    </fieldset>
  );
}
