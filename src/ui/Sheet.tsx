"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = panel.current;
    const returnTo = document.activeElement as HTMLElement | null;

    // A form field with autoFocus has already taken focus by now; otherwise
    // move focus into the panel, or the keyboard would stay on the page behind.
    if (node && !node.contains(document.activeElement)) {
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      // Keep Tab inside the panel while it is open.
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Send the keyboard back to whatever opened the sheet.
      if (returnTo && document.body.contains(returnTo)) returnTo.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`${printable ? "print-area" : ""} flex max-h-[92dvh] w-full ${
          wide ? "max-w-[760px]" : "max-w-[560px]"
        } flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl outline-none sm:rounded-3xl`}
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
