"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";

interface UnsavedApi {
  setDirty(key: string, dirty: boolean): void;
  /** Run `proceed` now, or after the user confirms leaving unsaved changes. */
  guard(proceed: () => void): void;
}

const UnsavedContext = createContext<UnsavedApi | null>(null);

/**
 * "Masz niezapisane zmiany." — intercepts in-app link clicks (capture phase,
 * before Next's <Link> handler), browser reload/close and explicit
 * `guard()` calls while any registered form is dirty.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dirty = useRef(new Set<string>());
  const [pending, setPending] = useState<(() => void) | null>(null);

  const setDirty = useCallback((key: string, value: boolean) => {
    if (value) dirty.current.add(key);
    else dirty.current.delete(key);
  }, []);

  const guard = useCallback((proceed: () => void) => {
    if (dirty.current.size === 0) proceed();
    else setPending(() => proceed);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dirty.current.size === 0 || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => {
        dirty.current.clear();
        router.push(url.pathname + url.search + url.hash);
      });
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size === 0) return;
      e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [router]);

  return (
    <UnsavedContext.Provider value={{ setDirty, guard }}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Masz niezapisane zmiany.</AlertDialogTitle>
            <AlertDialogDescription>Jeśli opuścisz tę stronę, wprowadzone zmiany zostaną utracone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zostań</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const proceed = pending;
                setPending(null);
                dirty.current.clear();
                proceed?.();
              }}
            >
              Opuść
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedContext.Provider>
  );
}

function useUnsavedApi(): UnsavedApi {
  const ctx = useContext(UnsavedContext);
  if (!ctx) throw new Error("UnsavedChangesProvider missing");
  return ctx;
}

/** Registers a form's dirty state for the leave-page guard. */
export function useUnsavedChanges(key: string, isDirty: boolean) {
  const { setDirty } = useUnsavedApi();
  useEffect(() => {
    setDirty(key, isDirty);
    return () => setDirty(key, false);
  }, [key, isDirty, setDirty]);
}

export function useNavigationGuard() {
  return useUnsavedApi().guard;
}
