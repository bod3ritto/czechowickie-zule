import { getDataset, isPreview } from "@/lib/data";
import { MapShell } from "@/components/map/map-shell";
import { PreviewBar } from "@/components/map/preview-bar";

/**
 * Shared by `/`, `/osoba/[slug]` and `/relacja/[id]`. Because the layout
 * persists across these routes, the graph keeps its layout and camera while
 * the page (rendered into the side panel) changes.
 */
export default async function MapLayout({ children }: LayoutProps<"/">) {
  const [dataset, preview] = await Promise.all([getDataset(), isPreview()]);
  return (
    <>
      <MapShell dataset={dataset}>{children}</MapShell>
      {preview && <PreviewBar />}
    </>
  );
}
