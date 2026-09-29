"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/result";

interface RunOptions<T> {
  /** Toast on success; defaults to the server's message. `false` = no toast. */
  success?: string | false;
  onSuccess?: (data: T) => void;
  onError?: (result: Extract<ActionResult<T>, { ok: false }>) => void;
  /** Re-fetch server components after success (default true). */
  refresh?: boolean;
}

/**
 * Runs a server action with loading state, toasts and error handling.
 * Network failures never surface raw errors to the user.
 */
export function useServerAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, options: RunOptions<T> = {}) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await action();
          } catch {
            result = { ok: false, error: "Brak połączenia z serwerem. Spróbuj ponownie." };
          }
          if (result.ok) {
            const message = options.success === undefined ? result.message : options.success;
            if (message) toast.success(message);
            options.onSuccess?.(result.data);
            if (options.refresh !== false) router.refresh();
          } else {
            toast.error(result.error);
            options.onError?.(result);
          }
          resolve(result);
        });
      }),
    [router],
  );

  return { run, pending };
}
