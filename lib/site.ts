export const site = {
  name: "Czechowickie Żule",
  title: "Czechowickie Żule — Mapa Powiązań",
  description: "Interaktywna mapa znajomości, historii i lokalnego lore Czechowic-Dziedzic.",
  url: "https://czechowickiezule.pl",
  locale: "pl_PL",
} as const;

export const personPath = (id: string) => `/osoba/${encodeURIComponent(id)}`;
export const relationshipPath = (id: string) => `/relacja/${encodeURIComponent(id)}`;
