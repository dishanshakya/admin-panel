// src/components/organisms/PayloadEntityForm.js
"use client";
import { Form } from "../molecules/Form.jsx";
import { PayloadField } from "../molecules/PayloadField.jsx";

export function PayloadEntityForm({ collectionFields, defaults, onSubmit, externalId=null }) {
  return (
    <Form defaults={defaults} id={externalId} onSubmit={onSubmit}>
      {collectionFields.map((field) => (
        <PayloadField key={field.name} field={field} />
      ))}
				{!externalId && <button type="submit">Save</button>}
    </Form>
  );
}
