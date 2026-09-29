/** Shown in preview mode on content that isn't public yet. */
export function DraftNotice() {
  return (
    <p className="mb-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 font-mono text-[11px] text-amber-200">
      PREVIEW — ta treść nie jest jeszcze publiczna.
    </p>
  );
}
