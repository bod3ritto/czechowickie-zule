"use client";

import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";

/** Visible while an admin browses the public site in preview (draft) mode. */
export function PreviewBar() {
  const pathname = usePathname();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-amber-400/40 bg-[#1a1407]/95 py-1.5 pl-3 pr-1.5 text-xs text-amber-100 shadow-2xl backdrop-blur">
        <Eye className="size-3.5 text-amber-300" aria-hidden="true" />
        <span>
          <strong className="font-semibold">PREVIEW</strong> — widzisz też treści nieopublikowane.
        </span>
        {/* Plain <a>: route handler, and prefetching it would exit preview. */}
        <a
          href={`/admin/preview/exit?path=${encodeURIComponent(pathname)}`}
          className="rounded-md border border-amber-300/30 px-2 py-1 font-medium hover:bg-amber-300/10"
        >
          Wyjdź z podglądu
        </a>
      </div>
    </div>
  );
}
