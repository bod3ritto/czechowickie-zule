import type { MetadataRoute } from "next";
import { getPublishedDataset } from "@/lib/data";
import { personPath, relationshipPath, site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { people, relationships } = await getPublishedDataset();
  return [
    { url: site.url, priority: 1 },
    { url: `${site.url}/ludzie`, priority: 0.8 },
    { url: `${site.url}/o-projekcie`, priority: 0.4 },
    ...people.map((p) => ({ url: `${site.url}${personPath(p.id)}`, priority: 0.7 })),
    ...relationships.map((r) => ({ url: `${site.url}${relationshipPath(r.id)}`, priority: 0.5 })),
  ];
}
