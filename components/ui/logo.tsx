import { cn } from "@/lib/format";

/** Three connected nodes — the same mark as the favicon. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#111115" stroke="#27272a" />
      <path d="M10 21.5 16 10l6 11.5H10Z" fill="none" stroke="#3f3f46" strokeWidth="1.2" />
      <circle cx="16" cy="10" r="3" fill="#111115" stroke="#fbbf24" strokeWidth="1.6" />
      <circle cx="10" cy="21.5" r="2.6" fill="#111115" stroke="#e4e4e7" strokeWidth="1.4" />
      <circle cx="22" cy="21.5" r="2.6" fill="#111115" stroke="#a78bfa" strokeWidth="1.4" />
    </svg>
  );
}
