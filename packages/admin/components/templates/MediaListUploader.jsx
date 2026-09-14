"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useResolvedDefault } from "../atoms/Input.jsx";
import { fetcher } from "../../utils/utils.js";
import { ImageUploader } from "./ImageUploader.jsx";

let uid = 0;
const nextId = () => `slot-${uid++}`;

export function MediaListUploader({ name, caption = "Gallery", columns = 4 }) {
  const { defaultValue: defaultIds } = useResolvedDefault(name, {});

  const [slots, setSlots] = useState([]);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!defaultIds?.length) {
      setResolved(true);
      return;
    }

    Promise.all(
      defaultIds.map((id) => fetcher(`/media/${id}`).then((res) => res.item))
    ).then((mediaObjects) => {
      setSlots(mediaObjects.filter(Boolean).map((media) => ({ id: nextId(), media })));
      setResolved(true);
    });
  }, [defaultIds]);

  const addSlot = () => {
    setSlots((prev) => [...prev, { id: nextId(), media: null }]);
  };

  const removeSlot = (id) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== id));
  };

  const gridColsClass =
    { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" }[columns] ||
    "grid-cols-4";

  if (!resolved) return null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{caption}</label>

      {slots.length > 0 && (
        <div className={`grid ${gridColsClass} gap-3`}>
          {slots.map((slot) => (
            <ImageUploader
              key={slot.id}
              name={`${name}[]`}
              caption=""
              defaultCover={slot.media}
              defaultValue={null}
              removeCoverImage={() => removeSlot(slot.id)}
              id={`gallery-${slot.id}`}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addSlot}
        className="flex w-fit items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-indigo-500 hover:text-indigo-500"
      >
        <Plus size={16} /> Add image
      </button>
    </div>
  );
}

