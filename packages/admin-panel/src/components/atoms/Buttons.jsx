"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronLeft } from "lucide-react";
import { Eye, Pencil, RotateCw, Trash2 } from "lucide-react";

const bare = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

export function Button({ className, onClick, children }) {
  return (
    <button className={`btn ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function BlueRedButton({ className, onClick, children }) {
  return (
    <button
      className={`btn bg-primaryBlue p-2 text-white ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function EditButton({ onClick }) {
  return (
    <button style={bare} title="Edit" onClick={onClick}>
      <Pencil size={16} />
    </button>
  );
}

export function DeleteButton({ onClick }) {
  return (
    <button style={bare} title="Delete" onClick={onClick}>
      <Trash2 size={16} color="red" />
    </button>
  );
}

export function ViewButton({
  href,
  target = "_blank",
  title = "View in website",
}) {
  return (
    <Link href={href} target={target} title={title}>
      <Eye size={16} />
    </Link>
  );
}
export function ResetButton({ onClick }) {
  return (
    <button
      style={bare}
      className="scale-x-[-1]"
      title="Reset"
      onClick={onClick}
    >
      <RotateCw size={16} />
    </button>
  );
}

export default function BackButton() {
  const router = useRouter();
  return (
    <button className="btn" onClick={() => router.back()}>
      <ChevronLeft size={20} />
    </button>
  );
}
