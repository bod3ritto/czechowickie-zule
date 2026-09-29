import type { Place } from "@/types/domain";

/**
 * Reusable places. Coordinates are approximate points in Czechowice-Dziedzice
 * and exist only to prepare the future geographic view.
 */
export const places = {
  rynek: { name: "Rynek", lat: 49.9118, lng: 19.0066 },
  dworzec: { name: "Dworzec PKP", lat: 49.9139, lng: 19.0017 },
  orlik: { name: "Orlik przy szkole", lat: 49.9071, lng: 19.0132 },
  stacja: { name: "Stacja paliw przy głównej", lat: 49.9182, lng: 19.0098 },
  blok: { name: "Ławka pod blokiem", lat: 49.9154, lng: 19.0171 },
  wisla: { name: "Nad Wisłą", lat: 49.9337, lng: 19.0212 },
  szkola: { name: "Stara podstawówka", lat: 49.9063, lng: 19.0105 },
  sklep: { name: "Sklep na rogu", lat: 49.9127, lng: 19.0149 },
  dzialki: { name: "Działki", lat: 49.9021, lng: 18.9954 },
} satisfies Record<string, Place>;
