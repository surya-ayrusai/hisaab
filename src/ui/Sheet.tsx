"use client";

import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/** A panel over the page: a bottom sheet on a phone, a centred card on a wider screen. */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  printable = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  printable?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`${printable ? "print-area" : ""} flex max-h-[92dvh] w-full ${
          wide ? "max-w-[760px]" : "max-w-[560px]"
        } flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl`}
      >
        <div className="no-print flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
