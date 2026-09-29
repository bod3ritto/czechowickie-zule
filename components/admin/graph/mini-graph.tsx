"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { GraphView } from "@/components/graph/graph-view";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useAdminGraphIndex } from "./admin-graph-view";

const NO_EMPHASIS = { kind: "none" } as const;

/** Small, read-only network preview for the dashboard. Click → edit person. */
export function MiniGraph() {
  const router = useRouter();
  const { network } = useAdminData();
  const index = useAdminGraphIndex(network);
  const visible = useMemo(
    () => ({ people: new Set(index.people.keys()), relationships: new Set(index.relationships.keys()) }),
    [index],
  );

  return (
    <div className="relative h-72 overflow-hidden rounded-md bg-[#08080a]">
      <GraphView
        index={index}
        visible={visible}
        emphasis={NO_EMPHASIS}
        fitKey="mini"
        panelOpen={false}
        onNodeClick={(id) => router.push(`/admin/people/${id}`)}
        onLinkClick={(id) => router.push(`/admin/relationships/${id}`)}
        onBackgroundClick={() => {}}
        onReady={() => {}}
      />
    </div>
  );
}
