import type { Metadata } from "next";
import { AdminGraph } from "@/components/admin/graph/admin-graph";

export const metadata: Metadata = { title: "Graf" };

export default function AdminGraphPage() {
  return <AdminGraph />;
}
