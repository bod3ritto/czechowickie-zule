"use client";

import Link from "next/link";
import type { RelationshipRow } from "@/lib/db/database.types";
import type { NetworkPerson } from "@/lib/admin/network";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { initials } from "@/lib/format";

const SIZE = 360;
const C = SIZE / 2;
const MAX_SHOWN = 18;

/**
 * Radial "ego network" of one person: the person in the middle, every
 * relationship as a spoke. Click a spoke or a name to edit that relationship.
 */
export function RelationshipOverview({
  person,
  relationships,
  peopleById,
}: {
  person: NetworkPerson;
  relationships: RelationshipRow[];
  peopleById: Map<string, NetworkPerson>;
}) {
  const shown = [...relationships].sort((a, b) => b.strength - a.strength).slice(0, MAX_SHOWN);
  const radius = shown.length > 10 ? 138 : 120;

  return (
    <figure className="grid place-items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[360px]" role="img" aria-label={`Relacje: ${person.name}`}>
        {shown.map((rel, i) => {
          const angle = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
          const x = C + Math.cos(angle) * radius;
          const y = C + Math.sin(angle) * radius;
          const otherId = rel.person_a === person.id ? rel.person_b : rel.person_a;
          const other = peopleById.get(otherId);
          const meta = RELATIONSHIP_TYPES[rel.type];
          return (
            <Link key={rel.id} href={`/admin/relationships/${rel.id}`}>
              <g className="group cursor-pointer">
                <line
                  x1={C}
                  y1={C}
                  x2={x}
                  y2={y}
                  stroke={meta.color}
                  strokeOpacity={0.35 + rel.strength / 200}
                  strokeWidth={1 + rel.strength / 40}
                  strokeDasharray={rel.confidence === "rumor" ? "4 4" : undefined}
                  className="transition-opacity group-hover:stroke-opacity-100"
                />
                <circle cx={x} cy={y} r={15} fill="#111115" stroke={meta.color} strokeWidth={1.5} />
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="600" fill={meta.color}>
                  {other ? initials(other.name) : "?"}
                </text>
                <text
                  x={x}
                  y={y + (y >= C ? 29 : -21)}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="currentColor"
                  className="fill-muted-foreground group-hover:fill-foreground"
                >
                  {other?.name ?? "?"}
                </text>
              </g>
            </Link>
          );
        })}
        <circle cx={C} cy={C} r={26} fill="#111115" stroke="#ededf0" strokeWidth={2} />
        <text x={C} y={C + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#ededf0">
          {initials(person.name)}
        </text>
      </svg>
      {relationships.length > MAX_SHOWN && (
        <figcaption className="text-xs text-muted-foreground">Pokazano {MAX_SHOWN} najsilniejszych z {relationships.length}.</figcaption>
      )}
    </figure>
  );
}
