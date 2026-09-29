/** Placeholder shown in the side panel while a profile streams in. */
export function PanelSkeleton() {
  return (
    <div role="status" aria-label="Ładowanie" className="animate-pulse">
      <div className="size-16 rounded-full bg-white/[0.06]" />
      <div className="mt-4 h-6 w-40 rounded bg-white/[0.06]" />
      <div className="mt-2 h-4 w-24 rounded bg-white/[0.04]" />
      <div className="mt-6 space-y-2">
        <div className="h-4 w-full rounded bg-white/[0.04]" />
        <div className="h-4 w-4/5 rounded bg-white/[0.04]" />
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-white/[0.05]" />
            <div className="h-4 flex-1 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}
