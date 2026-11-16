"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  closeOnEsc?: boolean;
};

export default function Modal({ title, onClose, children, wide, closeOnEsc = true }: Props) {
  useEffect(() => {
    if (!closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closeOnEsc]);

  return (
    <div className="emp-overlay fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`emp emp-bd modal-scroll max-h-[86vh] w-full overflow-y-auto rounded-[1.5rem] border-2 p-4 sm:p-5 ${
          wide ? "max-w-lg" : "max-w-md"
        }`}
      >
        <h2 className="mb-3 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
