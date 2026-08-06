"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type FormSubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
};

export function FormSubmitButton({ children, pendingLabel = "Saving...", className = "" }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 rounded-md bg-brand-moss px-4 text-sm font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
