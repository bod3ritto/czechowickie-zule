import type { SeedPerson } from "./types";

/**
 * FICTIONAL sample data. Every person here is a made-up placeholder.
 *
 * Used as the fallback data source when Supabase isn't configured and as
 * the source for `supabase/seed.sql` (`npm run db:seed:generate`).
 * `id` becomes the URL (`/osoba/<id>`): lowercase, no spaces or Polish letters.
 * `funFacts` become lore entries of type "ciekawostka".
 */
export const people: SeedPerson[] = [
  {
    id: "marek",
    name: "Marek",
    nickname: "Szef",
    bio: "Znany głównie z tego, że zawsze wie, gdzie wszyscy są.",
    legend: "Legenda głosi, że zna każdego kierowcę autobusu w mieście po imieniu.",
    category: "stala-ekipa",
    firstSeen: 2014,
    funFacts: [
      "Twierdzi, że zna skrót przez pół miasta.",
      "Ma w telefonie kontakt zapisany jako „NIE ODBIERAĆ (chyba że piątek)”.",
      "Jako jedyny pamięta, kto komu ile oddał.",
    ],
  },
  {
    id: "krzychu",
    name: "Krzychu",
    nickname: "Turbo",
    bio: "Pierwszy na miejscu, ostatni do wyjścia.",
    legend: "Legenda głosi, że kiedyś przyszedł na imprezę dzień wcześniej i nikt nie zauważył różnicy.",
    category: "legenda",
    firstSeen: 2013,
    funFacts: [
      "Pojawia się na każdej większej imprezie.",
      "Rower ma od 2009 roku i odmawia wymiany łańcucha.",
    ],
  },
  {
    id: "krzysiek",
    name: "Krzysiek",
    nickname: "Mały",
    aliases: ["Krzysio"],
    bio: "Mierzy prawie dwa metry. Stąd ksywka.",
    category: "bywalec",
    firstSeen: 2016,
    funFacts: [
      "Zawsze robi zdjęcia grupowe, bo i tak wszystkich widzi z góry.",
      "Ma lęk przed gołębiami, o którym wszyscy wiedzą.",
    ],
  },
  {
    id: "krzysztof",
    name: "Krzysztof",
    nickname: "Profesor",
    bio: "Mówi pełnymi zdaniami i nosi okulary, więc jest Profesorem.",
    legend: "Podobno ma w domu mapę osiedla z zaznaczonymi wszystkimi ławkami.",
    category: "z-daleka",
    firstSeen: 2018,
    funFacts: [
      "Wygrał kiedyś quiz w pubie w pojedynkę przeciwko czterem drużynom.",
      "Nikt nie wie, czy naprawdę jest profesorem. Nikt nie pyta.",
    ],
  },
  {
    id: "lysy",
    name: "Łysy",
    nickname: "Łysy",
    aliases: ["Lysy", "Mirek"],
    bio: "Łysy od liceum. Z wyboru, jak twierdzi.",
    legend: "Legenda głosi, że w 2016 roku jeszcze miał grzywkę. Są na to dwa zdjęcia.",
    category: "legenda",
    firstSeen: 2012,
    funFacts: [
      "Nikt nie wie, skąd ma ten numer.",
      "Ma teorię na każdy temat i dwie na temat pogody.",
    ],
  },
  {
    id: "bartek",
    name: "Bartek",
    nickname: "Bartas",
    bio: "Najspokojniejszy człowiek w ekipie. Do czasu.",
    category: "stala-ekipa",
    firstSeen: 2014,
    funFacts: [
      "Chodził z Markiem do jednej klasy przez 8 lat i siedział w innej ławce.",
      "Umie naprawić każdą zmywarkę, ale nie swoją.",
    ],
  },
  {
    id: "arek",
    name: "Arek",
    nickname: "Arczi",
    bio: "Specjalista od akcji, które „miały być na chwilę”.",
    legend: "Legenda głosi, że był na stacji o 3:00 w nocy częściej niż jej pracownicy.",
    category: "stala-ekipa",
    firstSeen: 2015,
    funFacts: [
      "Był świadkiem wydarzenia, o którym wszyscy mówią.",
      "Ma kartę lojalnościową stacji paliw z najwyższym poziomem, a nie ma auta.",
    ],
  },
  {
    id: "damian",
    name: "Damian",
    nickname: "Dziki",
    bio: "Energia na poziomie 140%. Zawsze.",
    category: "bywalec",
    firstSeen: 2017,
    funFacts: [
      "Zna na pamięć rozkład jazdy pociągów do Katowic.",
      "Kiedyś zgubił klapek w Wiśle i do dziś szuka.",
    ],
  },
  {
    id: "seba",
    name: "Seba",
    nickname: "Seba",
    aliases: ["Sebastian"],
    bio: "Człowiek-głośnik. Zawsze ma muzykę.",
    category: "bywalec",
    firstSeen: 2016,
    funFacts: [
      "Jego głośnik bluetooth ma więcej znajomych niż on.",
      "Twierdzi, że wymyślił słowo „sztos”.",
    ],
  },
  {
    id: "kamil",
    name: "Kamil",
    nickname: "Kamyk",
    bio: "Bramkarz. Na boisku i w życiu nic nie przepuści.",
    category: "stala-ekipa",
    firstSeen: 2015,
    funFacts: [
      "Obronił karnego w 2019 i opowiada o tym co tydzień.",
    ],
  },
  {
    id: "tomek",
    name: "Tomek",
    nickname: "Tomi",
    bio: "Pracuje ze wszystkimi. W różnych firmach. Jednocześnie.",
    category: "bywalec",
    firstSeen: 2017,
    funFacts: [
      "Ma trzy służbowe polary z trzech różnych firm.",
      "Zawsze ma przy sobie taśmę klejącą.",
    ],
  },
  {
    id: "mariusz",
    name: "Mariusz",
    nickname: "Pudzian",
    bio: "Siłownia to jego drugi dom. Pierwszy to ławka pod blokiem.",
    category: "bywalec",
    firstSeen: 2016,
    funFacts: [
      "Wniósł kiedyś pralkę na czwarte piętro sam. Nie jego pralkę.",
    ],
  },
  {
    id: "grzesiu",
    name: "Grzesiu",
    nickname: "Grzybek",
    aliases: ["Grzegorz"],
    bio: "Zbiera grzyby, historie i drobne na bilet.",
    category: "z-daleka",
    firstSeen: 2019,
    funFacts: [
      "Zna każde miejsce z kurkami w promieniu 20 km i nikomu nie powie.",
    ],
  },
  {
    id: "zbyszek",
    name: "Zbyszek",
    nickname: "Wujek",
    bio: "Niczyj wujek, ale wszyscy tak mówią.",
    legend: "Legenda głosi, że pamięta czasy, gdy na rynku była fontanna. Albo że jej nie było.",
    category: "legenda",
    firstSeen: 2010,
    funFacts: [
      "Zna wszystkich rodziców wszystkich osób na tej mapie.",
      "Ma zdanie na temat każdego remontu drogi od 1998 roku.",
    ],
  },
  {
    id: "kuba",
    name: "Kuba",
    nickname: "Kubson",
    bio: "Młodszy brat Bartka. Wszędzie chodził za starszymi.",
    category: "bywalec",
    firstSeen: 2018,
    funFacts: [
      "Przez pierwsze dwa lata myślał, że Łysy ma na imię Łysy.",
    ],
  },
  {
    id: "rafal",
    name: "Rafał",
    nickname: "Rafi",
    bio: "Znany z tego, że zawsze ma „jeszcze jedną sprawę do załatwienia”.",
    category: "z-daleka",
    firstSeen: 2020,
    funFacts: [
      "Nikt nie wie, czym się zajmuje. Wszyscy mają swoją teorię.",
    ],
  },
  {
    id: "ewka",
    name: "Ewka",
    nickname: "Szefowa",
    bio: "Jedyna osoba, której słucha Marek.",
    category: "stala-ekipa",
    firstSeen: 2015,
    funFacts: [
      "Prowadzi grupowy czat od 2016 roku i nigdy go nie wyciszyła.",
      "Organizuje wszystko. Dosłownie wszystko.",
    ],
  },
  {
    id: "magda",
    name: "Magda",
    nickname: "Madzia",
    bio: "Siostra Damiana. Zdecydowanie ta rozsądniejsza.",
    category: "bywalec",
    firstSeen: 2017,
    funFacts: [
      "Jako jedyna ma zdjęcia z każdej imprezy. I nie oddaje.",
    ],
  },
  {
    id: "dawid",
    name: "Dawid",
    nickname: "Cichy",
    bio: "Nic nie mówi, wszystko widzi.",
    legend: "Podobno do dziś trzyma paragon z tamtej nocy.",
    category: "z-daleka",
    firstSeen: 2021,
    funFacts: [
      "Powiedział w 2022 roku jedno zdanie, które wszyscy cytują.",
    ],
  },
  {
    id: "darek",
    name: "Darek",
    nickname: "Sąsiad",
    bio: "Mieszka za ścianą Marka i wie o wszystkim pierwszy.",
    category: "bywalec",
    firstSeen: 2016,
    funFacts: [
      "Zawsze ma pożyczyć wiertarkę. Nigdy nie ma pożyczyć wiertła.",
    ],
  },
];
