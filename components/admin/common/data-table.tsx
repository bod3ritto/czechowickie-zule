"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/admin/ui/input";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { Button } from "@/components/admin/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { OptionSelect } from "./inputs";
import { normalizeText } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Enables sorting by this column. */
  sortValue?: (row: T) => string | number;
  className?: string;
}

export interface TableFilter<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  /** Text searched by the search box (diacritics-insensitive). */
  searchText: (row: T) => string;
  searchPlaceholder?: string;
  filters?: TableFilter<T>[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  bulkActions?: (selectedIds: string[], clear: () => void) => ReactNode;
  rowActions?: (row: T) => ReactNode;
  /** Card layout for small screens. */
  mobileCard: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  empty: ReactNode;
  pageSize?: number;
}

/**
 * Client-side table: fast for the few thousand rows a local network has.
 * Search, filters, sorting, pagination, selection + bulk actions; renders
 * cards instead of a table on mobile.
 */
export function DataTable<T>({
  rows,
  columns,
  getId,
  searchText,
  searchPlaceholder = "Szukaj…",
  filters = [],
  initialSort,
  bulkActions,
  rowActions,
  mobileCard,
  onRowClick,
  empty,
  pageSize = 25,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    let out = rows.filter((row) => !q || normalizeText(searchText(row)).includes(q));
    for (const f of filters) {
      const v = filterValues[f.key];
      if (v) out = out.filter((row) => f.predicate(row, v));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const get = col.sortValue;
        out = [...out].sort((a, b) => {
          const va = get(a);
          const vb = get(b);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pl");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, filters, filterValues, sort, columns, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const visibleIds = visible.map(getId);
  const allOnPage = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  // Only ids that still exist (rows can disappear after a delete).
  const existing = new Set(rows.map(getId));
  const selectedIds = [...selected].filter((id) => existing.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (allOnPage) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  const clear = () => setSelected(new Set());
  const hasFilters = query || Object.values(filterValues).some(Boolean);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label="Szukaj w tabeli"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <OptionSelect
              key={f.key}
              className="h-9 w-auto min-w-36"
              value={filterValues[f.key] ?? ""}
              onChange={(v) => {
                setFilterValues((prev) => ({ ...prev, [f.key]: v }));
                setPage(0);
              }}
              allowEmpty
              emptyLabel={`${f.label}: wszystkie`}
              placeholder={f.label}
              options={f.options}
            />
          ))}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setFilterValues({});
              }}
            >
              <X /> Wyczyść
            </Button>
          )}
        </div>
      </div>

      {bulkActions && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-secondary/60 px-3 py-2 text-sm">
          <span className="mr-1 font-medium">Zaznaczono: {selectedIds.length}</span>
          {bulkActions(selectedIds, clear)}
          <Button variant="ghost" size="sm" onClick={clear} className="ml-auto">
            Odznacz
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        hasFilters ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Brak wyników dla tych filtrów.</p>
        ) : (
          empty
        )
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {bulkActions && (
                    <TableHead className="w-10">
                      <Checkbox checked={allOnPage} onCheckedChange={togglePage} aria-label="Zaznacz wszystkie na stronie" />
                    </TableHead>
                  )}
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.className}>
                      {col.sortValue ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() =>
                            setSort((s) => (s?.key === col.key ? { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: col.key, dir: "asc" }))
                          }
                        >
                          {col.header}
                          {sort?.key === col.key && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  ))}
                  {rowActions && <TableHead className="w-12 text-right" aria-label="Akcje" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => {
                  const id = getId(row);
                  return (
                    <TableRow
                      key={id}
                      data-state={selected.has(id) ? "selected" : undefined}
                      className={cn(onRowClick && "cursor-pointer")}
                      onClick={(e) => {
                        if (!onRowClick) return;
                        if ((e.target as HTMLElement).closest("button, a, [role=checkbox], [role=menuitem], input")) return;
                        onRowClick(row);
                      }}
                    >
                      {bulkActions && (
                        <TableCell>
                          <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} aria-label="Zaznacz wiersz" />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.cell(row)}
                        </TableCell>
                      ))}
                      {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="grid gap-2 md:hidden">
            {visible.map((row) => {
              const id = getId(row);
              return (
                <li key={id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                  {bulkActions && (
                    <Checkbox className="mt-1" checked={selected.has(id)} onCheckedChange={() => toggle(id)} aria-label="Zaznacz" />
                  )}
                  <div className="min-w-0 flex-1">{mobileCard(row)}</div>
                  {rowActions?.(row)}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} {filtered.length === 1 ? "wynik" : "wyników"}
              {filtered.length !== rows.length && ` z ${rows.length}`}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Poprzednia strona">
                  <ChevronLeft />
                </Button>
                <span className="px-2 tabular-nums">
                  {current + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                  aria-label="Następna strona"
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
