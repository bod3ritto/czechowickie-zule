"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/result";
import type { Status } from "@/lib/db/enums";

/**
 * Optimistic status changes for lists: the badge flips immediately, the
 * server confirms (or the row snaps back and an error toast is shown).
 */
export function useOptimisticStatus<T extends { id: string; status: Status }>(rows: T[]) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, apply] = useOptimistic(rows, (state, change: { ids: string[]; status: Status }) =>
    state.map((r) => (change.ids.includes(r.id) ? { ...r, status: change.status } : r)),
  );

  const setStatus = (ids: string[], status: Status, action: (input: { ids: string[]; status: Status }) => Promise<ActionResult>) =>
    new Promise<boolean>((resolve) => {
      startTransition(async () => {
        apply({ ids, status });
        let result: ActionResult;
        try {
          result = await action({ ids, status });
        } catch {
          result = { ok: false, error: "Brak połączenia z serwerem." };
        }
        if (result.ok) {
          toast.success(result.message ?? "Zapisano.");
          router.refresh();
        } else {
          toast.error(result.error);
        }
        resolve(result.ok);
      });
    });

  return [optimistic, setStatus] as const;
}
