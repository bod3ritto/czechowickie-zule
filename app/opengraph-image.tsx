import { OG_SIZE, renderOgCard } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "Czechowice-Dziedzice",
    title: "Mapa Powiązań",
    subtitle: "Kto kogo zna, skąd i od kiedy. Interaktywny graf lokalnego lore.",
  });
}
