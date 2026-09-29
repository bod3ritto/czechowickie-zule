"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export interface ToastMessage {
  id: number;
  title?: string;
  message: string;
}

export function Toast({ message, onDismiss }: { message: ToastMessage | null; onDismiss(): void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center px-4 sm:top-[72px]">
      {message && (
        <div
          key={message.id}
          className="animate-pop pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur md:mr-[440px]"
        >
          <div className="min-w-0">
            {message.title && <p className="text-sm font-semibold text-fg">{message.title}</p>}
            <p className="text-[13px] leading-relaxed text-fg-muted">{message.message}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Zamknij powiadomienie"
            className="-mr-1 grid size-6 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-white/[0.06] hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
