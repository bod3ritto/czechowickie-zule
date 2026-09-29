# Czechowickie Żule — Mapa Powiązań

Interaktywna mapa znajomości, historii i lokalnego lore Czechowic-Dziedzic
(**https://czechowickiezule.pl**) + prywatny panel administracyjny.

> Dane przykładowe (`data/*.ts`, `supabase/seed.sql`) są **fikcyjne**.

---

## 1. Instalacja

```bash
npm install
cp .env.example .env.local   # uzupełnij (patrz niżej)
npm run dev                  # http://localhost:3000
```

Wymagany Node.js ≥ 20.9.

| Skrypt | Co robi |
| --- | --- |
| `npm run dev` | serwer deweloperski |
| `npm run build` / `npm start` | build produkcyjny |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | testy (logika + prawdziwy Postgres w WASM dla RLS) |
| `npm run db:seed:generate` | generuje `supabase/seed.sql` z `data/*.ts` |

**Bez Supabase** strona publiczna działa na danych z `data/*.ts`, a `/admin` pokazuje instrukcję konfiguracji. Dzięki temu pierwszy deploy nie wymaga bazy.

## 2. Zmienne środowiskowe

| Zmienna | Gdzie | Opis |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | publiczna | URL projektu (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publiczna | klucz anon / publishable |

To wszystko. **Aplikacja nie używa klucza `service_role`** — każde zapytanie z panelu idzie z sesją zalogowanego admina, a uprawnienia egzekwuje Postgres (RLS). Klucz anon jest z założenia publiczny. `.env.local` jest w `.gitignore`; commitowany jest tylko `.env.example`.

## 3. Konfiguracja Supabase

1. Utwórz projekt na [supabase.com](https://supabase.com).
2. **Authentication → Providers → Email**: włączone. **Authentication → Sign In / Up**: wyłącz „Allow new users to sign up” (konta tworzysz ręcznie — i tak bez wpisu w `admin_users` nikt nie ma dostępu).
3. Skopiuj URL i klucz anon do `.env.local`.

## 4. Migracje

Dwa pliki w `supabase/migrations/`:

- `…_schema.sql` — tabele, indeksy, RLS, triggery (audit log, `updated_at`, `published_at`), funkcje `public_dataset()` i `admin_import()`,
- `…_storage.sql` — bucket `media` i polityki Storage.

**Opcja A — SQL Editor:** wklej i uruchom oba pliki po kolei.
**Opcja B — Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

## 5. Seed (dane testowe)

`supabase/seed.sql` — 20 osób, 45 relacji, 26 wydarzeń, 45 wpisów lore (kilka jako szkice do przetestowania publikacji). Uruchom w SQL Editorze albo:

```bash
npx supabase db push --include-seed
```

Seed jest idempotentny (stałe identyfikatory `md5('person:marek')::uuid`). Po zmianach w `data/*.ts` wygeneruj go ponownie: `npm run db:seed:generate`.

## 6. Pierwszy administrator

1. **Authentication → Users → Add user → Create new user** (e-mail + hasło, zaznacz „Auto confirm”).
2. W SQL Editorze:

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'twoj@email.pl';
```

3. Zaloguj się na `/admin/login`.

Kolejnych adminów dodajesz tak samo. Odebranie uprawnień: `delete from public.admin_users where email = '…';`

## 7. Uruchomienie

```bash
npm run dev
```

- `/` — mapa publiczna (tylko opublikowane treści)
- `/admin` — panel (wymaga logowania)

## 8. Deployment (Vercel)

1. Import repo w Vercel (Framework: Next.js, bez zmian w ustawieniach).
2. **Settings → Environment Variables**: dodaj obie zmienne `NEXT_PUBLIC_SUPABASE_*` (Production + Preview) i zrób redeploy — zmienne `NEXT_PUBLIC_*` są wbudowywane w build.
3. W Supabase **Authentication → URL Configuration** ustaw Site URL na `https://czechowickiezule.pl`.

Strony publiczne są statyczne (ISR). Każda zmiana w panelu wywołuje `revalidatePath`, więc publiczna mapa odświeża się od razu po zapisie; nowe osoby są renderowane przy pierwszym wejściu.

## 9. Model danych

```
people ─┬─< relationships >─┬─ people        (relacja nieskierowana: unikalna para A–B = B–A)
        ├─< event_people >── events ──< event_relationships >── relationships
        ├─< lore_people  >── lore
        └─< media (avatar)   media ── events / lore
locations ── people / relationships / events
admin_users ── auth.users
audit_logs (zapisywany wyłącznie przez triggery)
```

| Tabela | Najważniejsze pola |
| --- | --- |
| `people` | `slug` (unikalny, URL), `first_name`, `last_name`, `nickname`, `aliases[]`, `bio`, `legend`, `category`, `tags[]`, `birth_date`, `first_seen`, `location_id`, `admin_notes`, `status` |
| `relationships` | `person_a`, `person_b` (≠, para unikalna bez względu na kolejność), `type`, `strength` 0–100, `since_year`/`since_date`, `until_*`, `description`, `tone`, `confidence`, `source_type`, `source_note`, `status` |
| `events` (+ `event_people`, `event_relationships`) | `title`, `event_date` / `year` / `month`, `description`, `location_id`, `confidence`, `source_*`, `status` |
| `lore` (+ `lore_people`) | `title`, `content`, `lore_type` (historia/ciekawostka/cytat/legenda/inside-joke/plotka), `year`, `confidence`, `source_*`, `status` |
| `locations` | `name`, `description`, `address`, `lat`, `lng` |
| `media` | `storage_path` (plik w Storage — nigdy base64 w bazie), `kind`, właściciel (osoba/wydarzenie/lore), `is_primary` |
| `audit_logs` | `actor_email`, `action` (created/updated/deleted/published/unpublished/archived/imported), `entity_type`, `entity_label`, `created_at` |

Każda tabela treści ma `created_at`, `updated_at`, a publikowalne — `status`, `published_at`, `archived_at`.

### Status i pewność informacji

- **Status**: `draft` → `published` → `archived`. Publiczna mapa pokazuje **tylko** `published`. Relacja jest publiczna tylko wtedy, gdy obie osoby są opublikowane.
- **Pewność** (`confidence`) jest zawsze oznaczana publicznie, z wyjątkiem potwierdzonej:

| confidence | publicznie |
| --- | --- |
| confirmed | bez oznaczenia |
| probable | „na podstawie relacji” |
| lore | „lokalne lore” |
| rumor | „niepotwierdzone” + przerywana linia na grafie |

- **Źródło** (`source_type`, `source_note`) widzi tylko admin.

## Bezpieczeństwo

Trzy niezależne warstwy:

1. **Proxy** (`proxy.ts`, dawne middleware) — odświeża sesję i przekierowuje osoby bez sesji do `/admin/login`.
2. **Serwer** — layout panelu wywołuje `requireAdmin()` (weryfikacja JWT przez Supabase Auth + wpis w `admin_users`). Każda mutacja przechodzi przez `adminAction()`: sprawdzenie uprawnień → walidacja Zod → zapytanie z sesją admina. Frontend nie jest zaufany.
3. **Postgres (RLS + granty)**:
   - `anon`: `SELECT` wyłącznie na opublikowanych wierszach i **tylko na publicznych kolumnach** (granty kolumnowe — `source_note`, `admin_notes`, `last_name`, `birth_date`, adresy są niedostępne nawet przy bezpośrednim zapytaniu do API),
   - `authenticated`: pełny CRUD, ale każda polityka wymaga `is_admin()` — samo założenie konta nic nie daje,
   - `audit_logs`: pisane wyłącznie przez triggery `SECURITY DEFINER`, nie da się ich podrobić z API.

Publiczna strona pobiera dane jedną funkcją `public_dataset()` (`SECURITY INVOKER` → podlega RLS i grantom), która zwraca dokładnie pola potrzebne mapie. Podgląd szkiców (`/admin/preview`) działa tylko przy jednoczesnym ciasteczku draft mode **i** zweryfikowanej sesji admina.

## Panel administracyjny

| Ścieżka | |
| --- | --- |
| `/admin` | dashboard: liczniki, podgląd grafu, najnowsze osoby/relacje/wydarzenia, ostatnie zmiany, szybkie akcje |
| `/admin/graph` | pełny graf: klik → edycja obok grafu, „+ Dodaj relację” (klik A → klik B → formularz), ukrywanie, filtr typu, wyszukiwarka, focus, archiwum |
| `/admin/people`, `/new`, `/[id]` | tabela (szukaj po imieniu/nazwisku/ksywce/slugu/opisie, filtry, sortowanie, paginacja, akcje zbiorcze); edycja w zakładkach Profil / Relacje / Wydarzenia / Lore / Media / Podgląd |
| `/admin/relationships`, `/new`, `/[id]` | tabela relacji; formularz z kontrolą duplikatów (A–B = B–A), podglądem `[A] ─── [B]`, liczbą relacji obu osób i wspólnymi znajomymi |
| `/admin/events`, `/new`, `/[id]` | wydarzenia z uczestnikami, relacjami („Jak się poznali?”), lokalizacją, zdjęciami |
| `/admin/lore`, `/new`, `/[id]` | lore z typem, pewnością, źródłem i publikacją |
| `/admin/locations` | miejsca z współrzędnymi (pod przyszłą mapę) |
| `/admin/audit` | historia zmian |
| `/admin/settings` | eksport JSON, import JSON z podglądem i ostrzeżeniami (scal / zastąp) |

UX: **Ctrl/⌘+K** — wyszukiwarka wszystkiego · **N / R / E** — nowa osoba / relacja / wydarzenie (nie działają podczas pisania) · **+** w nagłówku — szybkie dodawanie z każdego miejsca · ostrzeżenie „Masz niezapisane zmiany” · toasty · potwierdzenia usuwania z ostrzeżeniem o liczbie relacji (duże usunięcia wymagają wpisania tekstu) · „Możliwe podobne osoby” przy dodawaniu · optymistyczne zmiany statusu i dat · „Zapisz” i „Zapisz i opublikuj” · widok kart i szuflada menu na telefonie.

Zdjęcia: przeciągnij i upuść → podgląd → upload z postępem bezpośrednio do Supabase Storage (przez jednorazowy podpisany URL wystawiony przez serwer), usuwanie, ustawianie głównego zdjęcia (= publiczny avatar).

## Architektura

```
app/
  (map)/               mapa publiczna (layout z grafem + panele osoby/relacji)
  admin/
    login/             logowanie
    (panel)/           chroniony layout + wszystkie strony panelu
    preview/           włączenie/wyłączenie podglądu szkiców
    export/            eksport JSON
components/
  graph/               renderer grafu (Canvas) — wspólny dla strony i panelu
  map/ person/ relationship/ ui/    UI publiczne
  admin/               UI panelu (shadcn/ui w admin/ui)
lib/
  auth/                getAdmin / requireAdmin, polityka dostępu
  supabase/            klienci (sesja admina, anonimowy)
  data/                źródło danych publicznych (Supabase lub data/*.ts)
  queries/             odczyty panelu
  actions/             server actions (mutacje)
  validations/         schematy Zod (formularze + serwer)
  admin/network.ts     logika sieci: pary, duplikaty, slugi, wspólni znajomi
  graph/               indeks grafu, BFS, statystyki
supabase/              migracje + seed
tests/                 unit + db (PGlite: prawdziwy Postgres, RLS jak w produkcji)
```

Wybór renderera grafu (react-force-graph-2d, Canvas + d3-force) i uwagi o wydajności przy 1000+ osób — patrz komentarze w `components/graph/`. Pre-layout liczony jest przed pierwszą klatką (~0,6 s dla 1000 osób), a po zapisie w panelu znane węzły zachowują pozycje.

## Testy

```bash
npm test
```

- `tests/unit` — walidacja osób/relacji/wydarzeń/lore, blokada relacji z samym sobą i duplikatów A–B/B–A, uprawnienia (`adminAction` odrzuca nie-adminów przed dotknięciem bazy), komunikaty błędów, wykrywanie podobnych osób, najkrótsza ścieżka, podgląd importu, zgodność enumów TS z SQL.
- `tests/db` — migracja uruchomiona w PGlite (Postgres w WASM) z rolami `anon`/`authenticated` jak w Supabase: RLS (anon widzi tylko published, nie widzi kolumn admina, nie może pisać; zalogowany nie-admin nie widzi nic), unikalność pary, trigger audit log i `published_at`, `public_dataset()` (bez szkiców dla anon, ze szkicami w podglądzie admina), import.

## Zasady treści

Jeśli na mapie mają pojawić się prawdziwe osoby: tylko za ich zgodą, z możliwością usunięcia wpisu na prośbę, bez danych wrażliwych i bez treści, które mogłyby kogoś zniesławić (RODO). Niezweryfikowane informacje są zawsze oznaczane.
