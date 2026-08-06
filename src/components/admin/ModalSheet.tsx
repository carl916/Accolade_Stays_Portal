"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalSheetProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function ModalSheet({ title, isOpen, onClose, children }: ModalSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-brand-border bg-white shadow-lg sm:max-w-2xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-border bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-brand-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-stone-600 transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
            aria-label={`Close ${title}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
