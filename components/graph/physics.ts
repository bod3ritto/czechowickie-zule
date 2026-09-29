import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { ForceGraphMethods } from "react-force-graph-2d";
import type { GLink, GNode } from "./draw";

/** Our links always have both ends set; d3's typings need that spelled out. */
type SimLink = GLink & { source: string | GNode; target: string | GNode };

const linkDistance = (l: GLink) => 34 + (1 - l.rel.strength) * 70;
const linkStrength = (l: GLink) => 0.25 + l.rel.strength * 0.5;
const CHARGE = -170;
const CHARGE_MAX_DISTANCE = 420;

/**
 * Force configuration shared by the synchronous pre-layout and the live
 * simulation, so the graph doesn't "jump" when interaction starts.
 */
export function createForces() {
  return {
    charge: forceManyBody<GNode>().strength(CHARGE).distanceMax(CHARGE_MAX_DISTANCE),
    link: forceLink<GNode, SimLink>().id((n) => String(n.id)).distance(linkDistance).strength(linkStrength),
    collide: forceCollide<GNode>((n) => n.radius + 8),
    // Gentle gravity keeps disconnected groups (e.g. when filtering) on screen.
    x: forceX<GNode>(0).strength(0.04),
    y: forceY<GNode>(0).strength(0.04),
  };
}

/**
 * Runs the simulation to (near) rest before the first paint, so deep links
 * like /osoba/marek can frame the person immediately. Cost is O(ticks·(V log V + E)),
 * so large graphs get fewer ticks.
 */
export function precomputeLayout(nodes: GNode[], links: GLink[]) {
  const ticks = nodes.length > 1500 ? 80 : nodes.length > 500 ? 150 : 300;
  const forces = createForces();
  const sim = forceSimulation<GNode>(nodes)
    .force("charge", forces.charge)
    .force("link", forces.link.links(links as SimLink[]))
    .force("collide", forces.collide)
    .force("x", forces.x)
    .force("y", forces.y)
    .stop();
  sim.tick(ticks);
  for (const node of nodes) {
    node.vx = 0;
    node.vy = 0;
  }
}

/**
 * Applies the same forces to force-graph's live simulation. The built-in
 * `link` and `charge` forces are tuned in place (force-graph feeds them the
 * current links); the extra forces are added.
 */
export function configureLiveForces(fg: ForceGraphMethods<GNode, GLink>) {
  const forces = createForces();
  fg.d3Force("link")?.distance(linkDistance).strength(linkStrength);
  fg.d3Force("charge")?.strength(CHARGE).distanceMax(CHARGE_MAX_DISTANCE);
  fg.d3Force("collide", forces.collide);
  fg.d3Force("x", forces.x);
  fg.d3Force("y", forces.y);
}
