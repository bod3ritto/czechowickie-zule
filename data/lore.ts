import type { LoreEntry } from "@/types/domain";

/**
 * FICTIONAL sample data: stories, quotes, legends and rumours.
 * (Per-person fun facts live inline in `people.ts` as `funFacts`.)
 *
 * `confidence` controls how the public site labels the entry:
 * confirmed → no label, probable → "na podstawie relacji",
 * lore → "lokalne lore", rumor → "niepotwierdzone".
 */
export const lore: LoreEntry[] = [
  {
    id: "l-fontanna",
    title: "Fontanna na rynku",
    content: "Wujek Zbyszek twierdzi, że na rynku była kiedyś fontanna. Połowa ekipy mu wierzy, druga połowa sprawdza w internecie.",
    type: "legenda",
    year: 2010,
    confidence: "lore",
    people: ["zbyszek"],
  },
  {
    id: "l-zdanie-dawida",
    title: "Zdanie Dawida",
    content: "„No i po co to było.” — jedyne zdanie Dawida z 2022 roku. Cytowane na każdej imprezie.",
    type: "cytat",
    year: 2022,
    confidence: "confirmed",
    people: ["dawid"],
  },
  {
    id: "l-tamta-noc",
    title: "Tamta noc na stacji",
    content: "Mówi się, że Arek i Dawid byli razem na stacji o trzeciej w nocy. Żaden z nich tego nie potwierdza.",
    type: "plotka",
    year: 2022,
    confidence: "rumor",
    people: ["arek", "dawid"],
  },
  {
    id: "l-sztos",
    title: "Kto wymyślił „sztos”?",
    content: "Seba twierdzi, że to on. Nikt nie ma dowodów ani przeciw, ani za.",
    type: "inside-joke",
    confidence: "lore",
    people: ["seba"],
  },
  {
    id: "l-grzywka",
    title: "Dwa zdjęcia z grzywką",
    content: "Istnieją dokładnie dwa zdjęcia Łysego z grzywką. Magda ma oba i nie oddaje.",
    type: "historia",
    year: 2016,
    confidence: "confirmed",
    people: ["lysy", "magda"],
  },
  {
    id: "l-klapek",
    title: "Klapek w Wiśle",
    content: "Klapek Damiana (albo Arka — wersje się różnią) wciąż płynie gdzieś w stronę Bałtyku.",
    type: "legenda",
    year: 2018,
    confidence: "lore",
    people: ["damian", "arek"],
  },
  {
    id: "l-skrot",
    title: "Skrót przez pół miasta",
    content: "Marek zna skrót, który rzekomo skraca drogę z dworca na rynek o połowę. Nikt nie zdążył go sprawdzić.",
    type: "legenda",
    confidence: "lore",
    people: ["marek"],
  },
  {
    id: "l-czat",
    title: "41 nazw czatu",
    content: "Grupowy czat Ewki zmieniał nazwę 41 razy. Obecna nazwa jest nieodpowiednia do publikacji.",
    type: "ciekawostka",
    year: 2024,
    confidence: "confirmed",
    people: ["ewka"],
  },
  {
    id: "l-rafal-zajecie",
    title: "Czym zajmuje się Rafał?",
    content: "Teorie: handel samochodami, IT, tajne służby, grzyby. Rafał tylko się uśmiecha.",
    type: "plotka",
    confidence: "rumor",
    people: ["rafal"],
  },
  {
    id: "l-karny",
    title: "Karny z 2019",
    content: "Kamil obronił karnego w 2019. W jego wersji strzelał reprezentant Polski juniorów.",
    type: "historia",
    year: 2019,
    confidence: "probable",
    people: ["kamil"],
  },
  {
    id: "l-grill",
    title: "Kto przyniósł węgiel?",
    content: "Na legendarnym grillu nikt nie przyniósł węgla. Każdy do dziś twierdzi, że miał to zrobić ktoś inny.",
    type: "inside-joke",
    year: 2019,
    confidence: "lore",
    people: ["marek", "krzychu", "darek"],
  },
  {
    id: "l-wiertarka",
    title: "Wiertarka Darka",
    content: "Wiertarka Darka odwiedziła każde mieszkanie w bloku. Wiertło — żadnego.",
    type: "inside-joke",
    confidence: "confirmed",
    people: ["darek"],
  },
];
