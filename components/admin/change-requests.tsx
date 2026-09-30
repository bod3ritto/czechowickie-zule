"use client";

import Link from "next/link";
import { Check, Pencil, RotateCcw, Trash2, UserX, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Badge } from "@/components/admin/ui/badge";
import { formatDate } from "@/components/admin/common/layout";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useCanDelete } from "@/components/admin/providers/admin-data";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { closeChangeRequest, removePersonForRequest } from "@/lib/actions/review";
import type { ChangeRequestRow } from "@/lib/db/database.types";
import { countLabel } from "@/lib/format";

/** Visitors' requests to fix something on the map or to remove a person. */
export function ChangeRequests({ open, closed }: { open: ChangeRequestRow[]; closed: ChangeRequestRow[] }) {
  const { run, pending } = useServerAction();
  const confirm = useConfirm();
  const isAdmin = useCanDelete();
  const removals = open.filter((r) => r.kind === "removal");
  const corrections = open.filter((r) => r.kind === "correction");

  const removePerson = async (r: ChangeRequestRow) => {
    const ok = await confirm({
      title: `Usunąć ${r.target_label} z mapy?`,
      description: "Osoba zniknie z mapy razem ze swoimi relacjami i zdjęciami. Tego nie da się cofnąć. Prośba zostanie oznaczona jako załatwiona.",
      confirmLabel: "Usuń z mapy",
      destructive: true,
    });
    if (ok) await run(() => removePersonForRequest({ id: r.id }));
  };

  const card = (r: ChangeRequestRow) => {
    const editHref = r.person_id ? `/admin/people/${r.person_id}` : r.relationship_id ? `/admin/relationships/${r.relationship_id}` : null;
    const removal = r.kind === "removal";
    return (
      <article
        key={r.id}
        aria-label={`Prośba: ${r.target_label}`}
        className={
          removal
            ? "flex flex-col gap-3 rounded-lg border border-red-500/30 bg-red-500/[0.06] p-4 sm:flex-row sm:items-start sm:justify-between"
            : "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
        }
      >
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 font-medium">
            {removal && <UserX className="size-4 text-red-400" />}
            {r.target_label}
            <Badge variant="outline">{r.relationship_id ? "relacja" : r.person_id ? "osoba" : "już usunięte"}</Badge>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(r.created_at, true)}
            {r.submitted_by && <> · od: {r.submitted_by}</>}
            {r.contact && (
              <>
                {" "}
                · kontakt: <span className="text-foreground">{r.contact}</span>
              </>
            )}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>
        </div>
        {removal && !isAdmin ? (
          <p className="shrink-0 text-xs text-muted-foreground sm:max-w-40 sm:text-right">Prośby o usunięcie obsługuje administrator.</p>
        ) : (
          <div className="flex shrink-0 flex-wrap gap-2">
            {editHref && (
              <Button size="sm" variant="ghost" asChild>
                <Link href={editHref}>
                  <Pencil /> Edytuj
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={pending} onClick={() => void run(() => closeChangeRequest({ id: r.id, status: "rejected" }))}>
              <X /> Odrzuć
            </Button>
            {removal && r.person_id ? (
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => void removePerson(r)}>
                <Trash2 /> Usuń z mapy
              </Button>
            ) : (
              <Button size="sm" disabled={pending} onClick={() => void run(() => closeChangeRequest({ id: r.id, status: "resolved" }))}>
                <Check /> Załatwione
              </Button>
            )}
          </div>
        )}
      </article>
    );
  };

  if (open.length === 0 && closed.length === 0) return null;

  return (
    <div className="grid gap-6">
      {removals.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-medium">
            Prośby o usunięcie z mapy <span className="text-muted-foreground">({removals.length})</span>
          </h2>
          <p className="-mt-1 text-xs text-muted-foreground">Załatw je w pierwszej kolejności: osoba nie chce być na mapie.</p>
          {removals.map(card)}
        </section>
      )}

      {corrections.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-medium">
            Prośby o zmianę <span className="text-muted-foreground">({corrections.length})</span>
          </h2>
          {corrections.map(card)}
        </section>
      )}

      {closed.length > 0 && (
        <details className="rounded-lg border bg-card px-4 py-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Ostatnio zamknięte prośby ({countLabel(closed.length, "prośba", "prośby", "próśb")})
          </summary>
          <ul className="mt-3 grid gap-2">
            {closed.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <Badge variant="outline" className="mr-2">
                    {r.status === "resolved" ? "załatwione" : "odrzucone"}
                  </Badge>
                  {r.kind === "removal" ? "Usunięcie: " : ""}
                  {r.target_label} — <span className="text-muted-foreground">{r.message}</span>
                </span>
                {(isAdmin || r.kind === "correction") && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => void run(() => closeChangeRequest({ id: r.id, status: "open" }))}>
                    <RotateCcw /> Otwórz ponownie
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
