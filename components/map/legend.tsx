import { PERSON_CATEGORIES, RELATIONSHIP_TYPES } from "@/lib/relationship-types";

function LinePreview({ color, dash }: { color: string; dash: number[] }) {
  return (
    <svg width="28" height="6" aria-hidden="true" className="shrink-0">
      <line
        x1="0"
        y1="3"
        x2="28"
        y2="3"
        stroke={color}
        strokeWidth="1.6"
        strokeDasharray={dash.length ? dash.map((d) => d * 2.2).join(" ") : undefined}
      />
    </svg>
  );
}

export function Legend() {
  return (
    <div className="space-y-4 text-xs">
      <section>
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Osoby</h3>
        <ul className="grid grid-cols-2 gap-1.5">
          {Object.entries(PERSON_CATEGORIES).map(([key, meta]) => (
            <li key={key} className="flex items-center gap-2 text-fg-muted">
              <span className="size-2.5 rounded-full border-[1.5px]" style={{ borderColor: meta.color }} />
              {meta.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-fg-subtle">Większy punkt = więcej połączeń.</p>
      </section>
      <section>
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Relacje</h3>
        <ul className="grid gap-1.5">
          {Object.entries(RELATIONSHIP_TYPES).map(([key, meta]) => (
            <li key={key} className="flex items-center gap-2.5 text-fg-muted">
              <LinePreview color={meta.color} dash={meta.dash} />
              {meta.label}
            </li>
          ))}
          <li className="flex items-center gap-2.5 text-fg-muted">
            <span className="grid h-4 w-7 place-items-center">
              <span className="grid size-3.5 place-items-center rounded-full border border-fg-subtle font-mono text-[9px]">?</span>
            </span>
            Niepotwierdzona (plotka)
          </li>
        </ul>
        <p className="mt-2 text-fg-subtle">Grubsza linia = mocniejsza relacja.</p>
      </section>
    </div>
  );
}
