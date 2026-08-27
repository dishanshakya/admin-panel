"use client";

import { Input, Textarea } from "../atoms/Input";

const typeMap = {
  text: Textarea,
};

export function InputFields({ fields, className }) {
  return (
    <>
      {fields.map((field, i) => {
        const isObject = typeof field === "object";
        const rawName = isObject ? field.name : field;

        const [name, shorthandType] = rawName.split(":");
        const Component = typeMap[shorthandType] ?? Input;

        return (
          <Component
            key={name ?? i}
            className={className}
            {...(isObject ? field : {})}
            name={name}
          />
        );
      })}
    </>
  );
}
