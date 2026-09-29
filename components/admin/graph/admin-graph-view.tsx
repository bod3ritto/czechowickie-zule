"use client";

import { useMemo } from "react";
import type { Dataset } from "@/types/domain";
import { buildGraphIndex } from "@/lib/graph/model";
import type { Network } from "@/lib/admin/network";

/**
 * Adapts the admin network (UUID ids, drafts included) to the public graph
 * model so the very same canvas renderer can be reused in the panel.
 */
export function useAdminGraphIndex(network: Network, { includeArchived = false } = {}) {
  return useMemo(() => {
    const people = network.people.filter((p) => includeArchived || p.status !== "archived");
    const ids = new Set(people.map((p) => p.id));
    const dataset: Dataset = {
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname ?? undefined,
        bio: p.bio,
        category: p.category,
        avatarUrl: p.avatarUrl ?? undefined,
        status: p.status,
      })),
      relationships: network.relationships
        .filter((r) => ids.has(r.personA) && ids.has(r.personB) && (includeArchived || r.status !== "archived"))
        .map((r) => ({
          id: r.id,
          personA: r.personA,
          personB: r.personB,
          type: r.type,
          strength: r.strength / 100,
          since: r.since ?? undefined,
          description: "",
          status: r.status,
        })),
      events: [],
      lore: [],
    };
    return buildGraphIndex(dataset);
  }, [network, includeArchived]);
}
