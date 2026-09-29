"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

interface DialogProps {
  open: boolean;
  onClose(): void;
  title: string;
  /** Visually hide the title (still read by screen readers). */
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper around native <dialog>: gives us focus trapping, Escape handling
 * and the top layer for free.
 */
export function Dialog({ open, onClose, title, hideTitle, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before showModal(), so focus the intended field explicitly.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={cn(
        "animate-pop m-auto w-[min(560px,calc(100vw-24px))] max-h-[min(640px,calc(100dvh-48px))] overflow-hidden rounded-xl border border-line bg-surface p-0 text-fg shadow-2xl shadow-black/70",
        "backdrop:bg-black/60 backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className={cn("flex items-center justify-between gap-4 border-b border-line px-4 py-3", hideTitle && "sr-only")}>
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij"
              className="rounded-md p-1 text-fg-muted hover:bg-white/5 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
            >
              <X className="size-4" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
