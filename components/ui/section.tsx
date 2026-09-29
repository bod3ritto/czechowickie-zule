import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function PanelSection({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">{title}</h2>
        {aside && <span className="font-mono text-[10px] text-fg-subtle">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">{children}</p>;
}
