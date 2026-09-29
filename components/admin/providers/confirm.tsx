"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
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
import { Input } from "@/components/admin/ui/input";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** Highlighted warning, e.g. "Ta osoba ma 17 relacji i 4 wydarzenia." */
  warning?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** User must type this text to enable the confirm button. */
  requireText?: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** `const confirm = useConfirm(); if (await confirm({...})) …` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    setTyped("");
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const blocked = Boolean(options?.requireText && typed !== options.requireText);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {options?.warning && (
            <div className="flex gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <div>{options.warning}</div>
            </div>
          )}
          {options?.requireText && (
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">
                Wpisz <strong className="font-mono text-foreground">{options.requireText}</strong>, aby potwierdzić.
              </span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>{options?.cancelLabel ?? "Anuluj"}</AlertDialogCancel>
            <AlertDialogAction
              disabled={blocked}
              onClick={(e) => {
                if (blocked) {
                  e.preventDefault();
                  return;
                }
                close(true);
              }}
              className={cn(options?.destructive && "bg-destructive text-white hover:bg-destructive/90")}
            >
              {options?.confirmLabel ?? "Potwierdź"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
