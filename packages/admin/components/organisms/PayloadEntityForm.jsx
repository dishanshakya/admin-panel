// src/components/organisms/PayloadEntityForm.js
"use client";
import { Form } from "../molecules/Form.jsx";
import { PayloadField } from "../molecules/PayloadField.jsx";

function splitColumns(fields) {
  const left = [];
  const right = [];
  for (const field of fields) {
    (field.column === "right" ? right : left).push(field);
  }
  return { left, right };
}

export function PayloadEntityForm({ collectionFields, defaults, onSubmit, externalId = null }) {
  const { left, right } = splitColumns(collectionFields);

  return (
    <Form defaults={defaults} id={externalId} onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col  gap-6 lg:flex-row">
        <div className="flex min-w-0 rounded-sm bg-white p-6 border border-gray-200 flex-2 flex-col gap-4">
          {left.map((field) => (
            <PayloadField key={field.name?.split(":")?.[0]} field={field} />
          ))}
        </div>

        {right.length > 0 && (
          <div className="flex flex-col gap-4 rounded-sm border border-gray-200 bg-white p-4 lg:flex-1 ">
            {right.map((field) => (
              <PayloadField key={field.name?.split(":")?.[0]} field={field} />
            ))}
          </div>
        )}
      </div>

      {!externalId && (
        <button
          type="submit"
          className="self-start rounded-md bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Save
        </button>
      )}
    </Form>
  );
}
