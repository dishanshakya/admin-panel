"use client";
import { DeleteButton } from "../atoms/Buttons";

import { useApi } from "../../contexts/ApiContext";

export function DeleteAction({ route, mutate }) {
  const { del } = useApi();

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) return;
    const res = await del(`${route}`, { success: "Successfully deleted" });
    if (res?.statusCode == 200) mutate?.();
  };

  return <DeleteButton onClick={handleDelete} />;
}
